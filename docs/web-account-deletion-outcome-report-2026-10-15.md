# Web account deletion contract alignment — October 15, 2026

## Root cause addressed (web source defects, not incident root cause)

The old web client accepted any successful HTTP status with positive flags,
relied on noncontractual public `stage` fields to recognize rejections, and
defaulted other server errors to “did not complete.” Its deletion documentation
also incorrectly promised safe retry of Auth-stage failures and broad erasure.

The client now follows both supplied October 15 authoritative documents.
Only HTTP 200 application/json with a non-array object, both strict true flags
and no error field confirms deletion. Exact current error-only status/string
pairs distinguish request-scoped auth/confirmation rejections; everything else
is conservatively unconfirmed. Both documented 500s are unconfirmed.

The merged correction that records confirmed success before local sign-out and
isolates navigation errors is preserved. No public diagnostic field, absent
identity or local cleanup result can manufacture or revoke contracted success.

## Evidence limits and unresolved contract gaps

Retained candidate API logs show confirmed cleanup followed by unexpected Auth
acknowledgment diagnostics. They do not prove actual Auth removal failed and are
not uniquely correlated to the original incident. The original request's
response, destination/release correlation, exact Auth result and full hosted
cleanup coverage remain unestablished. The user's reported missing profile/Auth
identity is not an independent all-store erasure audit.

The current public contract cannot reliably establish true partial deletion.
That remains a separately evidenced support classification with escalation and
no retry. No partial-result envelope, retryability guarantee, status endpoint,
idempotency infrastructure, correlation header or API proposal was invented.

## Changed files

- `artifacts/postround-web/src/lib/account-deletion/client.ts`: JSON accept
  header, cookie/redirect exclusion, strict status/envelope gate, exact current
  rejection pairs, neutral unknown outcomes, sanitized support evidence.
- `artifacts/postround-web/src/lib/account-deletion/client.test.ts`: exact request,
  origin safeguards, all documented errors, mismatched/unknown/contradictory
  responses, non-200 positive flags, primitives/arrays, strict booleans,
  malformed/empty/interrupted JSON, network/abort/timeout and evidence privacy.
- `artifacts/postround-web/src/app/delete-account/DeleteAccountClient.tsx`:
  distinguish rejection/unconfirmed presentation, support details, bounded
  coverage/retention copy, preserve success-before-local-cleanup/latch.
- `artifacts/postround-web/e2e/delete-account-outcomes.spec.ts`: authoritative
  error-only fixtures, outcome matrix, final no-retry/no-raw/no-sign-out assertions,
  field edits and repeated submission protection, existing cleanup/navigation cases.
- `artifacts/postround-web/e2e/delete-account-confirmation.spec.ts`: pending
  request now expects neutral unconfirmed wording; retain real mock-SDK tests.
- `artifacts/postround-web/docs/account-deletion-contract.md`: current decision
  table, request, retention, support and provenance limits; remove safe-retry claims.
- This completion report and the supersession note in
  `docs/vercel-main-deletion-false-failure-investigation-2026-10-15.md`.
- Root `.gitignore` and `.replitignore`: exclude generated screenshot outputs.

No API/server, database/schema/migration/grant, billing, dependency or deployment
changes. Existing post-success helpers, test-only SDK/router adapters, fixture
server, page wrapper and isolation configuration need no behavioral change.

## Commands and results

- `pnpm --filter @workspace/postround-web exec node --experimental-strip-types --test src/lib/account-deletion/*.test.ts src/app/delete-account/*.test.ts`
  — 59 passed, zero failures. An initial run caught unsupported TypeScript
  parameter-property syntax in the new evidence constructor; replaced with
  an ordinary declared property and assignment before the passing run.
- `pnpm --filter @workspace/postround-web run typecheck` — passed.
- `PATH="$PWD/node_modules/.bin:$PATH" sh artifacts/postround-web/e2e/run-tests.sh delete-account-confirmation.spec.ts delete-account-outcomes.spec.ts`
  — **47 passed, zero assertion failures**: confirmation suite 5/5, outcomes
  suite 42/42. The isolated `.next-e2e` production-mode build passed through
  `pnpm run build` in the fixture runner, with loopback API/Auth configuration.
  No live fallback or managed-preview build output was used.
  The first attempt was blocked by a missing matching Chromium executable;
  `PATH="$PWD/node_modules/.bin:$PATH" playwright install chromium` installed
  the test-runner browser, then the same targeted suites passed in 1.4 minutes.
  No runner/assertion blockers remain. The runner restored generated Next
  TypeScript config files; no fixture changes were required.
- Managed web workflow restarted once after the application edits and reported
  ready. A signed-out preview screenshot at `/delete-account` showed the
  Sign In Required guard and normal layout; an unrelated browser resource 404
  is not deletion evidence. Signed-in outcome behavior is verified by the
  isolated browser assertions, not the signed-out screenshot.
- `git diff --check` — passed.

## Safety, blocked checks and release scope

No production data access, SQL/RPC, production deletion requests, new service
connections, credential inspection, Android builds or deployment/publishing.
No mock outcome is presented as historical or production proof.

Production correlation, hosted-state verification and authoritative Auth-result
diagnosis are intentionally not performed: they require separate authorization
and existing evidence, not another deletion attempt. These are not blockers for
the bounded web client correction and are not claimed resolved.

A separately approved **web-only release after merge is sufficient to deliver
these client changes**, with the deliberately configured authoritative API origin.
It cannot repair or diagnose the API's unexpected Auth acknowledgment, recover
a lost historical response, or certify universal erasure. No API deployment is
part of this task. Nothing has been deployed.
