# Cloud Portfolio 
building a full-stack, serverless resume website for practical cloud engineering work

## Tech Stack and Environment
- Frontend and Routing: Astro
- Content Delivery Network (CDN) and Hosting: Firebase Hosting
- Database: Firestore
- Infrastructure as a Code (IaaC): Terraform
- CI/CD: Github Actions
- Analytics: BigQuery

## Local Development Setup
- Git: 2.52.0.windows.1
- Node: v24.12.0
- Firebase: 15.24.0
- Terraform: 1.16.3
- Google Cloud SDK: 585.0.0
  - Components
    - BigQuey: 2.1.38
    - Central Orchestration Engine (CORE): 2026.09.11
    - gcloud-crc32c 1.0.0
    - gsutil 5.37
- Astro: 7.3.3

## Owner-only analytics dashboard

The public portfolio keeps only its aggregate profile-view and resume-download
counters. Detailed reports are available at `/admin/analytics` after Google
sign-in, and the Cloud Run API accepts analytics requests only from the
verified account configured as `racell.sincioco@gmail.com`. The dashboard API
returns aggregates only; it does not return IP addresses or raw request URLs.

Before deploying the dashboard:

1. In Google Cloud Console, create a Google OAuth client ID for a web
   application. Add the deployed Firebase Hosting origin (and any custom
   domain) to its authorized JavaScript origins.
2. Add the client ID as the `GOOGLE_OAUTH_CLIENT_ID` repository variable in
   GitHub Actions. The client ID is public configuration, not a client secret.
3. Create/update the `page_views` and `resume_downloads` views by running the
   corresponding `CREATE OR REPLACE VIEW` statements in
   `analytics/hosting-logs.sql`. The `hosting_logs` sink and `analytics`
   dataset must exist first. Terraform creates the aggregate-only
   `security_probes` view and grants the API service account access only to
   these authorized views.
4. Deploy the `main` branch. The workflow builds the site with the OAuth
   client ID, configures the API allowlist, applies the view permissions, and
   checks that the resume analytics endpoint responds.

Use tagged resume links such as `/resume.pdf?src=linkedin`,
`/resume.pdf?src=github`, or `/resume.pdf?src=application` to distinguish
those sources. Untagged downloads still appear with their available referrer
host or `(none)`.

Location is not available from the configured Firebase Hosting log fields.
The dashboard intentionally does not send visitor IPs to a geolocation
provider; its visitor IDs are daily hashes, so unique visitor counts represent
visitor-days rather than cross-day identities.
