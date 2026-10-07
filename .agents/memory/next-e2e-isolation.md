---
name: Next E2E isolation
description: Why browser tests must not share a Next build directory with the managed preview workflow.
---

Run authenticated browser suites against an isolated production build directory rather than a second development server sharing the preview workflow's cache.

**Why:** Concurrent Next development servers can corrupt hot-reload and client-reference manifests, producing misleading auth/navigation failures after the real session has succeeded. Next builds may also rewrite tracked TypeScript helper files.

**How to apply:** Give E2E builds their own `distDir`, avoid HMR for authenticated route suites, and restore Next-generated config files from an outer runner after Playwright exits.

The Playwright package may be installed without its matching Chromium executable in this environment. If browser launch reports a missing headless-shell binary, install the browser for the installed Playwright version before rerunning the suite. This is a test-runner dependency issue, not an app failure.

Keep the isolated Next fixture on trusted loopback with a browser base URL
matching Next's normalized redirect hostname (`localhost`, not `0.0.0.0`).

**Why:** Next can derive redirect origins from the bind hostname. A redirect from
`127.0.0.1` to `0.0.0.0` or `localhost` drops the referral cookie and fails origin checks, creating
false signup/claim failures. Production-Secure cookies also need trusted
loopback in the HTTP fixture.

**How to apply:** Bind only the isolated fixture to `127.0.0.1` and use `localhost`
as the fixture browser origin (Next normalizes loopback binds); do not weaken
production cookie security or origin validation to accommodate the test runner.

Finish slow isolated builds independently of the browser server-start deadline, then use an explicitly
validated, completed build for focused fixture reruns.

**Why:** Aborting a nearly finished production build at repeated startup deadlines can waste several
minutes per retry without testing anything. Fixture-only or locator-only changes do not require another
application build.

**How to apply:** Keep normal runs building by default; only reuse a completed isolated build whose
application source and configuration have not changed. Never reuse the managed preview's development output.

Treat browser actionability failures separately from authentication failures.

**Why:** The legacy Chromium headless shell stalled on animation-frame based clicks even when fields
could be filled and no Auth request was sent. After workspace recovery, current Chromium headless mode
completed the same assertions; an Auth-flow workaround would have addressed the wrong problem.

**How to apply:** Inspect whether a failed click actually sent a request, and check browser mode and
workspace health before altering authentication code or bypassing normal actionability checks.