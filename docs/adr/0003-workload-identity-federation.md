# 0003: Workload Identity Federation instead of service account keys

Status: Accepted
Recorded: 2026-09-30

## Context

GitHub Actions needs permission to deploy to Google Cloud. The usual shortcut is a service account JSON key stored as a GitHub secret. That key never expires, and anyone who obtains it can act as the account from anywhere.

## Decision

Use Workload Identity Federation. GitHub issues a short-lived token for each workflow run, and Google Cloud exchanges it for temporary credentials. Trust is pinned in two places:

- The provider only accepts tokens where `assertion.repository == 'chocuuuu/cloud-portfolio'`.
- The service account's `workloadIdentityUser` binding names that same repository, not a wildcard.

Workflows run on pushes to `main` only, never on pull requests.

## Alternatives considered

- **A JSON key in GitHub secrets.** Simple, but it is a long-lived secret that can leak and needs manual rotation.
- **Deploying only from a laptop.** No stored secret, but no automation either.

## Consequences

- No long-lived key exists to leak.
- Setup is more involved, and a wrong attribute condition would be a real hole, so the condition is checked with `gcloud` after any change.
- The trust boundary is now the GitHub repository and the account that controls it, so that account needs two-factor authentication.
