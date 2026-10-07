<!-- Draft: check that every number below matches what you actually deployed, then delete this line. -->
# 0004: Least-privilege runtime identity and cost caps

Status: Accepted
Recorded: 2026-10-06

## Context

The visitor-count endpoint is public by design, because the browser calls it directly. Anyone can send it requests with a script, and every request writes to Firestore. The risks are a larger bill, a polluted counter, and exhausted free-tier quotas. Separately, a Cloud Run service that runs as a powerful account turns any bug into a bigger incident.

## Decision

- Cloud Run runs as a dedicated account, `visitor-api-sa`, which holds only `roles/datastore.user`.
- The deploy account may act as that account (`roles/iam.serviceAccountUser`, scoped to that single account).
- Every deploy sets `--max-instances 3`, `--concurrency 20`, `--memory 256Mi`, and `--timeout 10s`, so cost and load have a ceiling.
- Budget alerts email me early. A budget does not stop spending, so the instance cap is the real limit.
- The browser counts a visit once per session.

## Alternatives considered

- **The default Compute Engine account.** No setup, but it carries broader permissions than the API needs.
- **Requiring authentication on the API.** The site has no users, so there is nothing sensible to authenticate.
- **Cloud Armor or API Gateway.** Strong, but they add cost and a load balancer, which conflicts with ADR 0001.

## Consequences

- A compromised or abused API can touch Firestore and nothing else.
- A flood of traffic can fill the three instances and slow the counter. The rest of the site is static and keeps working.
- The counter is a vanity metric, not a unique-visitor figure.
