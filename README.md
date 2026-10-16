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
   domain) to its authorized JavaScript origins. Ensure the Cloud project has
   the IAM API enabled; the deploy workflow now enables it before Terraform
   plans. Set the app audience to External and add the owner account as a test
   user while the OAuth app is in Testing.
2. The workflow uses this public client ID by default. If it changes, override
   it with the `GOOGLE_OAUTH_CLIENT_ID` GitHub Actions repository variable;
   this is public configuration, not a client secret. The workflow sets
   `ANALYTICS_ADMIN_EMAIL` to the dashboard owner account.
3. Ensure Firebase Hosting logs are exported to the BigQuery `hosting_logs`
   dataset and the `analytics` dataset exists. Create/update the
   `page_views` and `resume_downloads` views by running the corresponding
   `CREATE OR REPLACE VIEW` statements in `analytics/hosting-logs.sql`.
   Terraform creates the aggregate-only `security_probes` view and grants the
   API service account access only to these views.
4. Deploy the `main` branch. The workflow applies the view permissions, builds
   the site with the OAuth client ID, deploys the Cloud Run API, and checks
   that `GET https://visitor-api-pauw6umqta-uc.a.run.app/api/resume-downloads`
   returns an aggregate count.

The public resume-download counter calls
`GET https://visitor-api-pauw6umqta-uc.a.run.app/api/resume-downloads`.
It reports non-bot requests for `/resume.pdf` from the BigQuery view. The
resume PDF itself is served by Firebase Hosting, not downloaded through this
API. If the endpoint returns 404, the deployed Cloud Run revision is stale;
if it returns 500, check the BigQuery view and API service-account permissions.

The owner dashboard is at `/admin/analytics`. After Google sign-in, it shows
summary totals for page views, resume downloads, visitor-days, bots, and 404
requests, plus date-filtered daily activity, browsers, referrer hosts, tagged
resume sources, and frequent 404 paths. Visitor totals are daily pseudonymous
IDs, so they are visitor-days rather than cross-day people.

Use tagged resume links such as `/resume.pdf?src=linkedin`,
`/resume.pdf?src=github`, or `/resume.pdf?src=application` to distinguish
those sources. Untagged downloads still appear with their available referrer
host or `(none)`.

Location is not available from the configured Firebase Hosting log fields.
The dashboard intentionally does not send visitor IPs to a geolocation
provider; its visitor IDs are daily hashes, so unique visitor counts represent
visitor-days rather than cross-day identities.
