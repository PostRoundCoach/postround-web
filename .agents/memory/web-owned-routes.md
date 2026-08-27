---
name: Web-owned routes beside the shared API
description: Routing constraint for server endpoints implemented inside the Post Round Coach web artifact.
---

Server endpoints implemented in the web artifact must use a web-owned path outside `/api` while the separate API artifact claims the `/api` proxy prefix.

**Why:** Browser requests to `/api/*` are routed to the shared API service, so a Next.js route handler at the same public path compiles but is unreachable through the artifact preview.

**How to apply:** Put web-local protected read handlers under a clearly scoped non-API prefix, or intentionally add the endpoint to the shared API contract and service instead.