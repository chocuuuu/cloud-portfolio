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