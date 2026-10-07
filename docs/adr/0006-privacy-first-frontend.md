# 0006: Privacy-first frontend: no cookies, no third-party requests

Status: Proposed
Recorded: 2026-10-06

## Context

A portfolio for a cloud engineer should not quietly hand visitors' data to third parties. The usual defaults, such as Google Fonts and client-side analytics, do exactly that.

## Decision

- Fonts are self-hosted through Fontsource (Google Sans Flex), so the browser never contacts Google's font servers.
- The site sets no cookies and loads no tracking or advertising scripts.
- The view count is fetched once per browser session and cached in `sessionStorage`, so it is not tied to anyone across visits.

## Alternatives considered

- **Google Fonts from the CDN.** Fewer files to ship, but it sends every visitor's IP address to Google.
- **Google Analytics or a similar tracker.** Rich data, but cookies and third-party requests.

## Consequences

- Slightly larger downloads from the site itself, since the font files are bundled.
- The count measures sessions, not distinct people.
- Real analytics comes from server logs instead (ADR 0007).
