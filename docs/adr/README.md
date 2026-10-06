# Architecture Decision Records

Short notes on the important technical decisions behind this portfolio: what the problem was, what I chose, what I rejected, and what it costs me.

| # | Decision | Status |
|---|---|---|
| [0001](0001-serverless-stack-on-google-cloud.md) | Serverless stack on Google Cloud's free tier | Accepted |
| [0002](0002-terraform-with-remote-state.md) | Terraform with remote state in Cloud Storage | Accepted |
| [0003](0003-workload-identity-federation.md) | Workload Identity Federation instead of service account keys | Accepted |
| [0004](0004-runtime-identity-and-cost-caps.md) | Least-privilege runtime identity and cost caps | Accepted |
| [0005](0005-security-headers-and-csp.md) | Security headers and a strict CSP | In Progress |
| [0006](0006-privacy-first-frontend.md) | Privacy-first frontend: no cookies, no third-party requests | Proposed |
| [0007](0007-hosting-logs-to-bigquery.md) | Analytics from Hosting logs in BigQuery | Proposed |

Each record follows the same shape: context, decision, alternatives considered, consequences. A new decision gets the next number. A decision that is replaced is marked as superseded, not deleted.
