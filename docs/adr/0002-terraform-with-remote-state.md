# 0002: Terraform with remote state in Cloud Storage

Status: Accepted
Recorded: 2026-09-24

## Context

Infrastructure created by clicking in the console is hard to reproduce, review, or undo. The project also needs a pipeline that can apply changes without anyone's laptop being involved.

## Decision

Define the infrastructure (Firestore, Firebase, the Hosting site, the state bucket) in Terraform under `infra/`. Store state in the `cloud-portfolio-509107-tfstate` bucket with versioning and uniform bucket-level access, and apply from GitHub Actions.

## Alternatives considered

- **Console setup only.** Fast, but nothing is written down and nothing can be reviewed.
- **gcloud scripts.** Repeatable, but they do not track what already exists or detect drift.
- **Local Terraform state.** Works for one person on one machine, and cannot be shared with a pipeline.

## Consequences

- Changes are reviewed as diffs, and a bad apply can be rolled back through state versions.
- State can contain resource details, so the bucket must stay private.
- Anything created by hand, such as the Cloud Run service and some IAM bindings, is not yet tracked. Moving those into Terraform is future work.
