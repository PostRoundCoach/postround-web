---
name: Next E2E isolation
description: Why browser tests must not share a Next build directory with the managed preview workflow.
---

Run authenticated browser suites against an isolated production build directory rather than a second development server sharing the preview workflow's cache.

**Why:** Concurrent Next development servers can corrupt hot-reload and client-reference manifests, producing misleading auth/navigation failures after the real session has succeeded. Next builds may also rewrite tracked TypeScript helper files.

**How to apply:** Give E2E builds their own `distDir`, avoid HMR for authenticated route suites, and restore Next-generated config files from an outer runner after Playwright exits.