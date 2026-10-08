# 0007: Analytics from Hosting logs in BigQuery

Status: Proposed
Recorded: 2026-10-07

## Context

The portfolio should show real usage without client-side trackers. Firebase Hosting already sees every request, so the data exists on the server side.

## Decision

Link Firebase Hosting to Cloud Logging, route those logs to a BigQuery dataset with a sink, and query them with SQL. Raw logs live in one dataset (`hosting_logs`) with a 90-day expiry. Analysis reads from a view in a second dataset (`analytics`) that keeps only page loads, flags bots, and replaces the IP address with a daily hash.

## Alternatives considered

- **Google Analytics.** Cookies, a third-party script, and consent banners.
- **A self-hosted client-side tracker.** Still adds scripts and visitor identifiers to every page.
- **The Cloud Run counter alone.** Cheap, but it says nothing about pages, referrers, or browsers.

## Consequences

- Logs appear in BigQuery roughly half an hour after a request, and only for requests made after the integration is linked.
- Raw logs still contain IP addresses until they expire, so the raw dataset must stay private.
- The daily hash is pseudonymous, not anonymous. It supports counting unique visitors per day and nothing more.
- Query and storage use should stay well inside BigQuery's free allowances at this traffic level.
