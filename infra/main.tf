terraform {
    backend "gcs" {
        bucket = "cloud-portfolio-509107-tfstate"
        prefix = "terraform/state"
    }
    required_providers {
        google = {
            # This is for lifecycle management of GCP resources including Compute Engine, Cloud Storage, and the like
            source = "hashicorp/google"
            version = "~> 5.0"
        }
        google-beta = {
            source = "hashicorp/google-beta"
            version = "~> 5.0"
        }
    }
}

provider "google" {
    project = "cloud-portfolio-509107"
    # Even though the project was made in SEA, the resources are being created in US-Central1 because of the GCP free tier
    region  = "us-central1"
}

provider "google-beta" {
    project = "cloud-portfolio-509107"
    region  = "us-central1"
}

# GCS Bucket for Terraform State
resource "google_storage_bucket" "terraform_state" {
    name          = "cloud-portfolio-509107-tfstate"
    location      = "US"
    force_destroy = true

    # Required to engorce new storage buckets to use Uniform bucket-level access
    uniform_bucket_level_access = true
    
    versioning {
        enabled = true
    }

    # Bucket management rule which will delete older versions of objects in the bucket after 5 newer versions are created
    lifecycle_rule {
        condition {
            num_newer_versions = 5
        }
        action {
            type = "Delete"
        }
    }
}

# Enable required APIs for GCP resources
resource "google_project_service" "firestore_api" {
    service = "firestore.googleapis.com"
    disable_on_destroy = false
}

resource "google_project_service" "firebase_api" {
    service = "firebase.googleapis.com"
    disable_on_destroy = false      
}

resource "google_project_service" "bigquery_api" {
    service = "bigquery.googleapis.com"
    disable_on_destroy = false
}

data "google_service_account" "visitor_api" {
    account_id = "visitor-api-sa@cloud-portfolio-509107.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "visitor_api_firestore" {
    project = "cloud-portfolio-509107"
    role    = "roles/datastore.user"
    member  = "serviceAccount:${data.google_service_account.visitor_api.email}"
}

resource "google_project_iam_member" "visitor_api_bigquery_jobs" {
    project    = "cloud-portfolio-509107"
    role       = "roles/bigquery.jobUser"
    member     = "serviceAccount:${data.google_service_account.visitor_api.email}"
    depends_on = [google_project_service.bigquery_api]
}

resource "google_bigquery_table_iam_member" "visitor_api_resume_view" {
    project    = "cloud-portfolio-509107"
    dataset_id = "analytics"
    table_id   = "resume_downloads"
    role       = "roles/bigquery.dataViewer"
    member     = "serviceAccount:${data.google_service_account.visitor_api.email}"
    depends_on = [google_project_service.bigquery_api]
}

resource "google_bigquery_table_iam_member" "visitor_api_page_views_view" {
    project    = "cloud-portfolio-509107"
    dataset_id = "analytics"
    table_id   = "page_views"
    role       = "roles/bigquery.dataViewer"
    member     = "serviceAccount:${data.google_service_account.visitor_api.email}"
    depends_on = [google_project_service.bigquery_api]
}

resource "google_bigquery_table" "security_probes_view" {
    project    = "cloud-portfolio-509107"
    dataset_id = "analytics"
    table_id   = "security_probes"

    view {
        # Keep BigQuery's stored query line endings stable across Windows and Linux Terraform runs.
        query = replace(
            replace(<<-SQL
            WITH requests AS (
                SELECT
                    timestamp,
                    REGEXP_EXTRACT(httpRequest.requestUrl, r'^https?://[^/]+(/[^?#]*)') AS path,
                    httpRequest.status AS status
                FROM `cloud-portfolio-509107.hosting_logs.firebasehosting_googleapis_com_webrequests`
            )
            SELECT DATE(timestamp) AS day, path
            FROM requests
            WHERE status = 404
              AND path IS NOT NULL
        SQL
            , "\r\n", "\n"),
            "\n",
            "\r\n"
        )
        use_legacy_sql = false
    }

    depends_on = [google_project_service.bigquery_api]
}

resource "google_bigquery_table_iam_member" "visitor_api_security_probes_view" {
    project    = "cloud-portfolio-509107"
    dataset_id = "analytics"
    table_id   = "security_probes"
    role       = "roles/bigquery.dataViewer"
    member     = "serviceAccount:${data.google_service_account.visitor_api.email}"
    depends_on = [
        google_project_service.bigquery_api,
        google_bigquery_table.security_probes_view
    ]
}

resource "google_bigquery_dataset_access" "resume_downloads_authorized_view" {
    project    = "cloud-portfolio-509107"
    dataset_id = "hosting_logs"

    view {
        project_id = "cloud-portfolio-509107"
        dataset_id = "analytics"
        table_id   = "resume_downloads"
    }

    depends_on = [google_project_service.bigquery_api]
}

resource "google_bigquery_dataset_access" "page_views_authorized_view" {
    project    = "cloud-portfolio-509107"
    dataset_id = "hosting_logs"

    view {
        project_id = "cloud-portfolio-509107"
        dataset_id = "analytics"
        table_id   = "page_views"
    }

    depends_on = [google_project_service.bigquery_api]
}

resource "google_bigquery_dataset_access" "security_probes_authorized_view" {
    project    = "cloud-portfolio-509107"
    dataset_id = "hosting_logs"

    view {
        project_id = "cloud-portfolio-509107"
        dataset_id = "analytics"
        table_id   = "security_probes"
    }

    depends_on = [
        google_project_service.bigquery_api,
        google_bigquery_table.security_probes_view
    ]
}

resource "google_service_account_iam_member" "github_deployer_can_act_as_api" {
    service_account_id = data.google_service_account.visitor_api.name
    role               = "roles/iam.serviceAccountUser"
    member             = "serviceAccount:github-actions-deployer@cloud-portfolio-509107.iam.gserviceaccount.com"
}

# Provision Firestore database in Native mode
resource "google_firestore_database" "database" {
    name        = "(default)"
    location_id = "us-central1"
    type        = "FIRESTORE_NATIVE"
    depends_on  = [google_project_service.firestore_api]
}

# Seed the Collection with a document for testing purposes
resource "google_firestore_document" "visitor_count" {
    database = google_firestore_database.database.name
    collection = "visitors"
    document_id = "count"
    fields = "{\"count\": {\"integerValue\":\"0\"}}"

    lifecycle {
        ignore_changes = [fields]
    }
}

# Provision Firebase project
resource "google_firebase_project" "firebase" {
    provider = google-beta
    project = "cloud-portfolio-509107"
    depends_on = [google_project_service.firebase_api]
}

# Provision Firebase Hosting site
resource "google_firebase_hosting_site" "default" {
    provider = google-beta
    project = "cloud-portfolio-509107"
    site_id = "cloud-portfolio-509107-site"
    depends_on = [google_firebase_project.firebase]
}