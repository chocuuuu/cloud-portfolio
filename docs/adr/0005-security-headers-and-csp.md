# 0005: Security headers and a strict CSP

Status: Accepted
Recorded: 2026-10-02

## Context

A static site has a small attack surface, but the browser can still be protected from injected scripts, framing, and sniffing. The first scan of the deployed site scored B+ (80/100) on MDN Observatory because the Content Security Policy allowed inline scripts.

## Decision

Set response headers in `firebase.json`: a Content Security Policy, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and `Cross-Origin-Opener-Policy`. The CSP allows scripts only from the site's own origin and the API only through `connect-src`. To make that possible, every script is bundled as a file (`assetsInlineLimit: 0` in the Astro config). Styles still allow `'unsafe-inline'`, because the site uses a few inline style values.

The Projects page includes a live self-audit that reads these headers from the current page.

## Alternatives considered

- **Platform defaults only.** Firebase sends HSTS but little else.
- **A CSP with `'unsafe-inline'` for scripts.** Easier, and it cost 20 points on the first scan.
- **Hash-based allowances for inline scripts.** Stricter than the above, but hashes have to be regenerated on every build.

## Consequences

- The deployed site scored A+ (125/100) on MDN Observatory, with 12 of 12 tests passed.
- Any new inline script will be blocked in production. New scripts must be bundled, and any new third-party origin must be added to the CSP deliberately.
- Testing the CSP needs a preview channel or the hosting emulator, not the dev server.
