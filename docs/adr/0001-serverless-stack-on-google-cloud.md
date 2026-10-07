# 0001: Serverless stack on Google Cloud's free tier

Status: Accepted
Recorded: 2026-09-19

## Context

The portfolio should behave like a production deployment but cost close to nothing. It needs a static frontend, one small dynamic feature (a visitor counter), and somewhere to store the count.

## Decision

- **Frontend:** Astro, built to static files and served by Firebase Hosting.
- **API:** a small Node.js container on Cloud Run.
- **Database:** Firestore in Native mode.

All three scale to zero or sit inside Google Cloud's always-free allowances at portfolio traffic.

## Alternatives considered

- **A VM on Compute Engine.** Always running, needs patching, and is not free beyond a very small instance.
- **A storage bucket behind a load balancer.** The load balancer has a fixed monthly cost.
- **A non-Google host for the frontend, such as Netlify or Vercel.** Easier to start, but it would not show the Google Cloud services this portfolio is meant to demonstrate.

## Consequences

- Close to zero cost and no servers to patch.
- The first request after a quiet period is slower because Cloud Run has to start a container.
- Free-tier limits are a real design constraint. Because the API is public, usage beyond them is billed, which is why ADR 0004 exists.
