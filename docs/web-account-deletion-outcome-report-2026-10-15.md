# Web account-deletion outcome reporting — 2026-10-15

## 1. Findings and complete path

**Production root cause remains unresolved.** The user independently verified
that the production profile and Supabase Auth identity were removed. This is
accepted account-state evidence, not proof of the original HTTP status,
response, serving API release, completeness of all application-data cleanup,
or operation responsible for the displayed error.

The historical report `production-account-deletion-investigation-2026-10-14.md`
remains historical; its account-state uncertainty predates this new user
verification. Its API-ownership/access gap still applies. The authoritative API
belongs to the separate Post Round app project. This workspace's API artifact is
comparison source, not attested source for that serving release.

**Updated completion scope:** The user confirmed that they do not have the
original HTTP status, response body or API release information, and supplied no
owning-project link or incident export. They explicitly authorized proceeding
with their verified deletion outcome and existing code/test evidence, recording
the missing original response as unavailable rather than blocking validation of
the web correction. This report does not convert that authorization into a
confirmed production root-cause claim.

### Web sequence

1. `artifacts/postround-web/src/app/delete-account/page.tsx` renders the permanent
   deletion warnings and `DeleteAccountClient`.
2. `DeleteAccountClient.tsx` creates the Supabase browser client and calls
   `auth.getSession()`. Missing, rejected or thrown session loading never enables
   deletion. The acknowledgment checkbox and **exact**, untrimmed uppercase
   `DELETE` gate both the button and submit handler.
3. The handler calls `src/lib/account-deletion/client.ts` with the session access
   token. It validates the configured API origin (no Next fallback), sends POST
   `/api/account/delete`, bearer Authorization and only `{"confirmation":"DELETE"}`.
4. The client parses JSON and requires a successful HTTP status and the boolean
   flags `ok:true`, `deleted:true`. The revised client also rejects an `error`
   field in an otherwise successful body. Lost transport, interrupted parsing,
   malformed/empty/unexpected bodies and contradictory statuses remain
   **unconfirmed**, never fabricated success.
5. **Confirmed local defect in the original source:** `auth.signOut()` was awaited
   inside the request's try/catch, before recording success. A thrown sign-out
   therefore changed a validated API success into deletion failure. A returned
   SDK `{error}` object was ignored. The UI displayed the thrown error's message.
   This explains a reproducible defect, **not the observed production incident**.
6. Revised success is committed first; component session and both confirmations
   are cleared. Then `auth.signOut({scope:'local'})` runs separately. Returned and
   thrown SDK errors produce a separate browser-session warning. SDK error text
   is not exposed. No manual or broad browser-storage deletion is introduced.
   A synchronous submission latch also prevents duplicate form events.
7. There is no automatic home navigation. After success, the user clicks
   **Return to Home**. A separate helper handles synchronous throws and rejected
   navigation promises without changing success; the existing Back to Home link
   remains a fallback. Next's `router.push` normally returns void, so later
   asynchronous framework failures that do not reject this call cannot be
   observed by this helper, but cannot enter the deletion-error catch either.

### Comparison API sequence (not deployed-release proof)

`artifacts/api-server/src/routes/account.ts` requires exact `DELETE` and rejects
additional body keys before calling `deleteAuthenticatedAccount`. The latter
verifies the bearer against issuer Auth, verifies the authenticated identity in
the connected project, executes application cleanup, then removes Auth last.
Authentication rejection bodies remain unread. No authentication, grants,
identity derivation, cleanup SQL or Auth ordering has changed.

The reviewed cleanup RPC is transactional; Auth removal is a separate request.
A cleanup failure prevents Auth removal. An Auth failure can follow committed
application cleanup, so an error must not imply that all data is still present.
Existing API tests cover these stages and rejection-body safety.

The comparison route emits success only after the deletion function returns.
Completion logging and response emission occur afterward. A logging/response
exception can therefore also produce an error after side effects; no incident
evidence establishes that this happened. Changing this comparison route would
not prove or fix the authoritative API release, so it was not changed.

### Exact reported message

The reported text is:

> Account deletion could not be completed. Please contact support.

It is not the checked-in API fallback, which ends **“No success was recorded.”**
The original browser passes public API `error` text or a thrown error's message
to the UI. Either could carry the reported sentence; no available original
response or error stack identifies which operation did so. Fixture evidence must
not be substituted for that missing production evidence.

## 2. Status and sanitized response evidence

| Evidence | Status/body | What it establishes |
| --- | --- | --- |
| Original production attempt | **Unavailable** | No HTTP success/failure, response parsing or sign-out stage can be inferred from account absence. |
| Historical public web bundle | POST to `https://api.postroundcoach.com/api/account/delete` with exact confirmation JSON | Historical destination/contract, not original-request completion or API release. |
| Comparison route, offline success fixture | HTTP 200, `{"ok":true,"deleted":true}` | Local route/client contract only. |
| Comparison route, offline failure fixtures | 400 confirmation; 401 authentication; 500/503 cleanup or Auth stage; 500 unknown, without success flags | Local stage/error handling only. |
| Browser fixture unexpected responses | HTTP 200 with malformed/missing/contradictory JSON; 204 empty; 500 with success flags; aborted transport | Client must show unconfirmed outcome; never establish production outcome. |

Evidence needed to establish the production cause, if it becomes available: a
verified owning-project link/read access, or a
narrow sanitized export for the existing attempt showing UTC time, destination,
request/release identifiers if retained, HTTP status and public response
`ok`/`deleted`/`stage`/`retryable` fields and safe public error text; a sanitized
client stack naming the failing operation, if retained. Exclude bearer tokens,
cookies, keys, raw credential-bearing HAR/log exports and upstream authentication
rejection bodies. Do not reproduce deletion to obtain this evidence.
This evidence is **unavailable and non-blocking for the tested web correction**
under the user's updated instruction. Existing accessible historical logs do
not recover the original response or establish the authoritative serving release.

## 3. Exact changes

- `DeleteAccountClient.tsx`: separate request failure, confirmed success, local
  session cleanup and user-triggered navigation; handle session-load exceptions;
  clear component identity/confirmations; block repeated submissions.
- `src/lib/account-deletion/client.ts`: retain exact request/security and success
  flags; distinguish transport/response uncertainty from explicit API errors;
  avoid unsupported “please try again” advice; use safe client-owned stage
  messages rather than echoing arbitrary public error text. Partial cleanup is
  acknowledged as possible, not claimed as observed.
- `src/lib/account-deletion/post-success.ts`: small testable cleanup/navigation
  boundaries and separate warning text. Neither can change deletion outcome.
- Client/helper unit tests, confirmation source checks, existing Next fixture
  confirmation suite and a new isolated real-component browser suite cover the
  outcome boundaries. SDK/router adapters exist only in the test harness; there
  is no production fixture switch or live fallback.
- `playwright.config.ts`: add a loopback-only, in-memory real-component harness
  using the existing esbuild dependency. Next still uses its separate supported
  `.next-e2e` production build. `.replitignore` excludes generated test outputs.
- No API implementation, migration, database, billing or unrelated feature
  changes.

## 4. Verification

- `pnpm --filter @workspace/postround-web exec node --experimental-strip-types --test src/lib/account-deletion/*.test.ts src/app/delete-account/*.test.ts`
  — **11 passed**, no failures.
- `pnpm --filter @workspace/api-server exec node --test --experimental-strip-types src/lib/account-deletion.test.ts src/lib/account-deletion-regression.test.ts`
  — **12 passed**, no failures; all injected proxies/Auth fetches or loopback
  fixture routes, no production calls.
- `pnpm --filter @workspace/postround-web run typecheck`
  — **passed**.
- `PATH="$PWD/node_modules/.bin:$PATH" sh artifacts/postround-web/e2e/run-tests.sh delete-account-confirmation.spec.ts delete-account-outcomes.spec.ts`
  — **22 passed, 0 failed** in the completed isolated browser run. This includes
  normal real-SDK success/home navigation, real-SDK returned logout error,
  exact confirmation and signed-out guards, pending-submission locking, thrown/
  returned/pending cleanup, thrown/rejected navigation, genuine API stage
  failures and malformed/unexpected/interrupted responses. The test harness
  asserts final messages and no second deletion request. External browser
  traffic is denied; Auth/deletion use mocks and loopback fixtures only.
- The same runner completed `pnpm run build` through `e2e/start-app.sh`, with
  `NEXT_DIST_DIR=.next-e2e` and explicit loopback fixture configuration.
  **Isolated Next production-mode build passed**, with no reported build/type
  errors. This does not attest production API configuration or serving parity.
- Initial browser attempts: the unqualified runner command timed out; the first
  launched suite then had **22 browser-launch failures** because its matching
  Chromium binary was absent, not because assertions failed. The tester
  installed it with `pnpm exec playwright install chromium` and reran the same
  targeted suites successfully with the PATH-qualified command above.
  No assertion failures remain. No success screenshots were produced by that
  runner, so the signed-in outcomes are verified by browser assertions rather
  than visual artifacts.
- Managed web preview restarted once after changes; its workflow reported ready
  and its root returned HTTP 200. A signed-out `/delete-account` screenshot
  confirmed the Sign In Required guard and normal layout. An uncorrelated
  browser resource 404 was visible; this was not evidence about deletion.
- **Unavailable checks, not blockers under the user's revised scope:** original
  production-response/release/error-stage correlation,
  authoritative serving-source comparison and installed cleanup-contract
  attestation. No new production reads or tests are substituted for these.

## 5. Deployment scope

The isolated correction changes **web code only**, requiring a separately
approved web release after merge. No API deployment is justified by this work.
Whether the actual incident additionally requires an authoritative API change
remains blocked on its existing evidence and serving implementation. This is
not a claim that releasing the web correction resolves the production incident.

## 6. Safety and completion status

No production deployment, Android build, destructive production test, live
deletion request, cleanup RPC, production account creation, manual data change,
migration or credentials/rejection-body inspection was performed.

The reproducible web defect is corrected and its isolated checks pass. The work
is ready for completion under the user's explicitly revised scope, using their
verified production deletion outcome and existing code/test evidence. The
original HTTP response and production error-triggering operation remain
unavailable/unconfirmed; no fixture result is represented as production proof.
