# Post Round — User Account Deletion Contract

**Evidence date:** October 15, 2026. **Status:** implementation-grounded source contract, not certification of the incident-serving release or hosted database.

This is the handoff for the separate Post Round web project. The authoritative API implementation is in this app repository. No API, database, client, configuration or deployment changes are made by this document. Existing behavior is described below; recommendations are isolated under **Proposals**.

The companion [incident evidence report](account-deletion-incident-evidence-2026-10-15.md) distinguishes retained production records from source interpretation and user reports.

## 1. Authority and evidence boundaries

Source anchors, relative to the repository root:

| Reference | Authority and scope |
| --- | --- |
| S1 — `artifacts/api-server/src/app.ts:12–86` | Release header, HTTP logger, CORS, parsers, `/api` mount and global error handler. |
| S2 — `artifacts/api-server/src/routes/index.ts:24`; `src/routes/account.ts:20–114` in the same artifact | `/account` mount, `/delete` POST handler, validation, operation order, diagnostic and response branches. |
| S3 — `artifacts/api-server/src/middleware/requireAuth.ts:12–33`; `src/lib/supabaseAdmin.ts:5–21` | Server-side session verification and privileged client selection. |
| S4 — `supabase/production/web_sources/202609250001_creator_referrals.upload.sql:1–62,140–197` | Final **repository** referral-aware cleanup body, referral constraints/triggers and execution grants. Not a hosted definition export. |
| S5 — `supabase/production/WEB_SCHEMA_RECONCILIATION.md`; `DATABASE_FUNCTION_INVENTORY.md` in the same directory; `supabase/production/adaptations/007_security_controls.sql:530–625` | Repository dependency/security intent and distinction from older cleanup SQL. Offline validation is not production verification. |
| S6 — `artifacts/api-server/src/lib/logger.ts`; `src/lib/release.ts`; `build.mjs`; `.replit-artifact/artifact.toml` | Logging restrictions, build fingerprint and intended serving configuration. |
| S7 — `artifacts/api-server/src/routes/__tests__/account.delete.test.ts` | Local mocked branch expectations; Supabase calls are replaced. No hosted or historical proof. Tests were inspected, not run in this investigation. |
| S8 — `supabase/production/web_sources/059_account_deletion.historical.sql:79–83`; `003_admin_user_management.sql:15–23` | Earlier explicit retention rationale and audit FK definitions; the older cleanup body is superseded by S4. |

The source inspection baseline is checkout `6b11475d75d747c3ff5c0968a9a649444668b59f`. Its “Published your App” commit label is **not** a release-to-request mapping. Neither local source nor local `dist/` proves what served a historical request.

Hosted function body, owner, effective ACLs, constraints and triggers were **not verified** in this investigation. Supabase is external; the Replit-managed production database is not a substitute. Available Supabase integrations were not attached and multiple candidate connections had no established target mapping. No connection was selected, no credentials requested, and no database function or SQL was executed. Thus the SQL-level guarantees below are conditional on the reviewed repository definition actually being installed with its dependencies.

## 2. Existing request contract

```http
POST /api/account/delete
Authorization: Bearer <valid Supabase session access token>
Content-Type: application/json
Accept: application/json

{"confirmation":"DELETE"}
```

- Use the web deployment's deliberately configured authoritative API origin. Current deployment metadata returned `https://api.postroundcoach.com` and alias `https://post-round.replit.app`; this does not establish the original browser destination or Vercel rewrite. Do not derive that destination from mobile configuration or another API's code.
- Authentication is the literal, case-sensitive `Bearer ` prefix followed by a nonempty token. The server calls Supabase `auth.getUser(token)`; it does not just decode a JWT. Cookies, email, an API key or a service-role credential are not substitutes for the user's session token. The web client must never receive a service-role key.
- Only the verified user's UUID selects the account. The route checks UUID syntax after confirmation validation. Submitted `id`, `user_id`, `p_user_id`, email and nested identity values are ignored. There is no arbitrary-target or administrator override in this endpoint, no creator-only restriction, and no additional password/reauthentication challenge.
- `confirmation` must strictly equal the string `"DELETE"`: no trimming, case folding or coercion. Missing, lowercase, whitespace-padded, boolean, null and array values fail. Extra fields are not rejected but cannot select the account.
- JSON is the canonical interoperable request format. The app also enables `express.urlencoded({extended:true})`; a parsed form whose confirmation is the exact string can reach this route. Multipart/text bodies are not parsed into this contract; a valid session with no parsed confirmation gets 400. JSON/query-string identity fields do not change authorization; query-string confirmation is not read.
- `Accept` is recommended, not validated. No application-specific request ID, idempotency key, retry header, origin allowlist or rate-limit middleware is configured here. No cookie-based authentication/CSRF mechanism is supplied by this route; the protection is server-verified bearer authorization plus exact confirmation, not CORS.
- Both JSON and URL-encoded parsers have a `25mb` limit. JSON parsing uses Express defaults (including strict JSON object/array parsing). Malformed JSON, invalid encodings/compression, oversized bodies and parser errors happen **before** authentication and deletion.
- CORS runs before parsing/routes. With the installed `cors` defaults and this configuration, origin is `*`, preflight methods include POST, requested allowed headers are reflected, and normal preflight returns 204 without deletion. `X-API-Release` is exposed. `Access-Control-Allow-Credentials` is not enabled: use bearer authorization, not credentialed cookie fetches. Proxy/browser CORS failures can hide a response; they are not proof that a POST did not execute.
- The intended method is POST. Other methods do not invoke this deletion handler; standard unmatched routing can return framework 404 HTML rather than the route's JSON. Gateway, network and proxy errors are outside the route response contract.

### Relevant response headers

`Content-Type: application/json` accompanies the explicit JSON responses. `Cache-Control: no-store` is set only after the auth wrapper passes, before confirmation/UUID validation and deletion; initial auth rejection and parser failure do not get that route-set header. S1 sets `X-API-Release` before CORS/parsers/routes. No route code returns a request correlation header.

For bundled source, the release value is a verified `sha256:` fingerprint over emitted files; invalid manifests fail startup. Source-mode imports advertise `unbuilt`. The fingerprint is not a Git SHA or deployment ID, and a current health check/fingerprint cannot identify the incident release without historical evidence.

## 3. Ordered execution and transaction boundaries

1. Add release header; initialize pino HTTP request logging/correlation; apply CORS. Preflight can finish here.
2. Parse body; mount `/api`, `/account`, then POST `/delete`.
3. Verify the Supabase session. Reject missing/invalid/unverifiable sessions before cleanup. Authentication rejection logging occurs after the auth middleware has attempted its response.
4. Set no-store; validate exact confirmation; validate the server-verified UUID. Reject before cleanup on failure.
5. Obtain the cached server-only Supabase client, configured from `EXPO_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, with token refresh and persistence disabled. Configuration names do not establish which hosted project a historical release used.
6. Await `rpc("delete_own_account_data", {p_user_id: verifiedUserId})`. Require no SDK error and a non-null, non-array object with:
   - `cleaned === true`;
   - `auth_deletion_required === true`;
   - `deleted_rounds` a nonnegative safe integer.
   Extra result properties are tolerated. These are internal RPC results, not public response fields. Zero rounds is valid and does not prove other data was absent.
7. Only after that positive acknowledgement, call `auth.admin.deleteUser(verifiedUserId)`. The installed SDK defaults `shouldSoftDelete` to `false` (hard identity deletion). Require no SDK error **and** `data?.user?.id === verifiedUserId`. Null/missing/wrong returned identity is failure even if Auth actually removed the identity.
8. Log `account_deletion_completed`, then generate `res.json({ok:true,deleted:true})`. Completion logging is after both acknowledged operations but **before** response generation or delivery.
9. Automatic HTTP completion/error logging observes the server response lifecycle. It does not prove browser receipt, parsing or UI handling.

### Repository RPC's internal order (S4)

One PostgreSQL function invocation runs within its database transaction, with no intermediate explicit commit:

1. Reject null identity and check required relation existence. The relation check is not exhaustive column/FK/trigger verification; notably the subsequently used referral-link relation is not in the initial relation-existence check.
2. Acquire a transaction-scoped advisory lock derived from the user UUID. Snapshot the user's creator, round and story-candidate IDs.
3. Delete `content_ideas` matching those rounds/stories or creator IDs in `stats_used`.
4. Delete `story_permissions` matching the user or those creators; delete the user's `story_candidates`.
5. Delete holes for those rounds, then the user's rounds; record only the direct rounds row count.
6. Delete the user's VAD telemetry and those creators' social-account rows.
7. Set transaction-local `postround.account_erasure=on`; delete the user's creator attribution.
8. For user-owned creators with referral links, detach/anonymize the creator row: `user_id=NULL`, `status='inactive'`, `slug=NULL`, `display_name='Former creator'`, `bio=NULL`, `avatar_url=NULL`. Delete remaining user-owned creator profiles.
9. Reset the flag to `off`; delete the user's application `profiles` row.
10. Return `{cleaned:true, deleted_rounds:<count>, auth_deletion_required:true}`.

The immutable-attribution trigger permits deletion only under the transaction-local erasure flag; the slug-protection trigger also exempts that erasure context. Referral-link/event/attribution FKs use RESTRICT, motivating retained, detached creator rows. The repository function is SECURITY DEFINER with `search_path=public, pg_temp`, with EXECUTE revoked from PUBLIC/anon/authenticated and granted to service_role. Effective hosted ownership, privileges and dependency state remain unverified.

A reliable database statement/constraint failure rolls back that RPC transaction, including its deletes/updates. A transport error or malformed/lost acknowledgement is different: the transaction **may already have committed**. The API labels cleanup unconfirmed and does not call Auth in that branch. It has no readback to distinguish rollback from lost acknowledgement.

The Auth operation is a separate API request and separate transaction boundary. No transaction spans cleanup and Auth; there is no compensation, restoration or rollback of already committed cleanup. The advisory lock ends with the RPC and does not serialize the entire cleanup-plus-Auth workflow or all concurrent writes.

## 4. Cleanup coverage and retention limits

**Confirmed complete means the required acknowledged operations succeeded, not universal erasure across all stores.**

- Explicitly deleted relations/predicates are enumerated above. Repository FK cascades extend coverage: examples include profile-owned usage/credits, coaching/AI/practice data and Round Buddy messages; round/hole-owned shots; Auth-owned story/recap data. See `supabase/migrations/007_ai_reports.sql`, `008_practice_sessions.sql`, `022_user_usage.sql`, `024_credits_and_currency.sql`, `037_coaching_sessions.sql`, `043_voice_recap_tokens.sql`, `060_round_buddy_messages.sql`, and `062_player_stories.sql`. These are dependency intent, not a verified hosted cascade inventory.
- **Intentionally retained:** waitlist entries (separate marketing-consent rationale in S8); security/admin audit history (Auth FKs SET NULL in repository definitions, not whole-row erasure); detached creator rows with issued referral links, associated links/events and other users' attributions referencing those creators. Nulling a foreign key does not prove every retained field is anonymous.
- The final RPC does not explicitly erase every conceivable user-associated record. It relies on actual hosted constraints/triggers for additional cleanup and may fail if restrictive dependencies differ. Historical content not matching its predicates is not guaranteed removed.
- No explicit operation removes external Stripe customers/subscriptions/payment records, provider records, emails, logs, backups, analytics, uploaded media/object storage, caches, browser storage or published copies. In particular, this endpoint does **not** explicitly cancel billing. Retention policy, backup expiry, provider deletion and legal erasure compliance are not established here.
- The route does not read back all tables, enumerate external stores or verify pending/concurrent workers. Missing profile and Auth identity alone cannot establish all of this coverage.

## 5. Existing HTTP response contract

The table describes source response generation, not a guarantee that the response reaches the browser. All listed bodies are JSON objects. Public error bodies have only `error`; there is no stable public machine error code.

| Condition | Status | Exact body |
| --- | --- | --- |
| Both required operations positively acknowledged, completion log and response generation succeed | 200 | `{"ok":true,"deleted":true}` |
| Missing/non-Bearer/empty bearer token | 401 | `{"error":"Authentication required"}` |
| Verification SDK error or no verified user; also malformed verified UUID after confirmation | 401 | `{"error":"Invalid or expired session"}` |
| Verification throws, including privileged-client initialization failure there | 401 | `{"error":"Could not verify session"}` |
| Auth passed; confirmation missing/not exactly DELETE | 400 | `{"error":"Confirmation must be \"DELETE\""}` |
| Cleanup error/throw or invalid cleanup acknowledgement | 500 | `{"error":"Could not delete account. Please try again."}` |
| Cleanup confirmed; Auth error/throw or returned UUID missing/mismatched | 500 | `{"error":"Account deletion could not be completed. Please contact support."}` |
| Unhandled error while no response headers have been sent | 500 | `{"error":"Internal server error"}` |

**Field semantics:** `ok` and `deleted` exist only as the boolean literal `true` on the source success path. Neither is returned as `false` on handled errors. `stage`, `retryable`, `cleanupState`, `partialCompletion`, `deleted_rounds`, `cleaned` and `auth_deletion_required` are **absent from public route responses**. `stage`/cleanup state/partial-completion are internal diagnostics, not client fields. No public retryability value is implemented.

**Middleware exceptions:** the global handler does not preserve a parser's `err.status`. Parser errors ordinarily become generic 500 JSON, not a guaranteed 400/413; interrupted/failed connections may prevent a response entirely. Its logging can itself fail. If headers were already sent, it logs but does not generate a replacement JSON body or explicitly terminate/delegate the connection. Gateways may emit other statuses/bodies. Consequently “all errors are non-2xx JSON with error” from the [earlier endpoint note](account-deletion-contract.md) describes handled route branches, not every network/middleware outcome.

### Contradictory or ambiguous failures

- An HTTP 500 can follow committed cleanup and even actual Auth removal if the Auth acknowledgement does not contain the expected UUID or was lost. `partialCompletion:true` means cleanup confirmed and Auth **not confirmed**; it does not assert the identity definitely remains.
- Completion logging and `res.json` are outside the deletion try/catch blocks. If either throws after both operations, Express 5 can reach the global error handler; a 500 before headers are sent is possible even though deletion succeeded. The failure logger/response inside the helper can also throw. None of these mechanisms is established as the cause of the original incident.
- Serializing this fixed two-boolean success object has no ordinary circular-data problem, but framework/transport failures remain possible. A completion event is not delivery proof; a server finish event is not client receipt proof. Pino's generic “failed with status code 500” completion error is not, by itself, a thrown deletion or delivery exception.

## 6. Outcomes and safe client interpretation

| Semantic outcome | Existing evidence/representation | Required web treatment |
| --- | --- | --- |
| Confirmed complete | Valid authoritative 200 JSON with `ok === true` and `deleted === true`; server source gates it on acknowledged cleanup and matching Auth UUID. Coverage is limited to §4. | Mark server deletion confirmed before local sign-out/navigation. Show completion, clear local state as feasible. |
| Confirmed incomplete, no deletion started by this request | Known auth/confirmation rejection or separately established pre-operation failure. Routine 401/400 route errors indicate this, subject to middleware/proxy provenance. | Explain the rejected request. Do not infer prior attempts failed or data remains. Correct input/auth only when no earlier ambiguous attempt exists. |
| Partial deletion | Cleanup reliably committed and a required later operation reliably known not to have completed. Existing Auth-stage 500/logs show confirmed cleanup but do not always establish actual Auth failure. | Do not retry automatically; escalate. Public response alone cannot reliably distinguish partial from fully performed-but-unacknowledged deletion. |
| Unconfirmed | Timeout, abort, connection loss, non-JSON/unexpected response, unexpected 2xx, generic 500, cleanup transport ambiguity, or Auth acknowledgement ambiguity. | Say the outcome could not be confirmed, some data may be removed, and contact support before another request. Neither claim complete failure nor suggest retry. |

A reliable transactional SQL failure can establish no committed cleanup **for that invocation**, but the current public cleanup error does not distinguish it from transport ambiguity. Source cleanup `partialCompletion:false` with state `unconfirmed` is not proof that nothing was deleted. “Confirmed incomplete” and “partial deletion” are useful support classifications, not distinct current wire envelopes.

Despite the existing cleanup error's “Please try again” wording, the safe integration must **not** blindly retry that response. Display a neutral unconfirmed-outcome/support message where the client lacks reliable server-side evidence.

### Retry and support procedure

There is no idempotency key, persisted operation result, deletion-status endpoint, automatic retry safety promise or reconciliation API. Repeated SQL deletes of absent rows can be harmless in isolation, but that does not make the whole workflow idempotent: authentication may stop working after identity removal; the strict Auth-result check can still reject; concurrent requests can overlap after the RPC lock releases. A later 401/404 cannot confirm a previous deletion.

On an ambiguous/partial outcome, stop retries. Preserve the UTC request time, method/path, configured destination, sanitized status/body fields and any existing correlation/release identifier. Do not retain tokens, cookies, HAR files or raw upstream errors. Support must separately authorize identification of the account and read-only verification of the relevant database/Auth/provider scope. Readback absence must be assessed against coverage, not just two rows. Any remediation/retry or destructive test needs separate explicit approval; do not recreate erased data.

## 7. Web integration requirements

1. Preserve exact confirmation and bearer/session protections. Send the request only on explicit user action; suppress double submissions and automatic fetch retries.
2. Read the actual JSON and status together. Confirm success only on 200 with both strict boolean fields true; do not require `stage`, `retryable`, a user object or a third-project response format. Unknown/missing fields or malformed envelopes are not success.
3. Treat error responses according to the outcome limits above, not as proof of rollback. Never claim complete erasure from absent profile/Auth records or recommend repeating an unconfirmed deletion.
4. Record server success in client state **before** best-effort local sign-out, cache clearing or navigation. Catch those local failures separately. They must not rewrite confirmed deletion into “deletion failed” or resubmit deletion. A local failure before a response was confirmed does not manufacture server success either.
5. Capture only safe response fields/status, UTC time, configured API target and exposed release header. Current source does not expose a correlation ID. Do not send customer account IDs as deletion selectors or log session material.
6. The mobile Profile entry currently opens `https://postroundcoach.com/delete-account` (`artifacts/golf-coach/app/(tabs)/profile.tsx:442–445`). This is a UI destination, not proof of the web page's API origin, deployed handler or incident response.

The attachment reports a separate web correction separating successful deletion from local sign-out failures. That correction and its commit are user-supplied context, not inspected web implementation evidence in this workspace.

## 8. Existing observability and its limits

- The route emits `account_deletion_rejected` for confirmation rejection, `account_deletion_failed` for auth/cleanup/Auth-stage failure, and `account_deletion_completed` before success response generation.
- Route fields are event, `requestId`, `stage`, `errorCode` on failures, `cleanupState` (`not_started`, `unconfirmed`, `confirmed`) and `partialCompletion`. Completion has stage `complete`. Cleanup SQLSTATE-shaped codes and a restricted Auth-code allowlist are accepted; other SDK codes become `sdk_error`. Explicit result-validation codes include `unexpected_cleanup_result` and `unexpected_auth_result`.
- Pino HTTP serializes request ID/method/path without query string and response status, not request headers/bodies; it can emit response time and lifecycle errors. Its default request IDs are process-local counters, not globally unique traces. PID, process lifetime and timestamp must scope them. No correlation response header, operation ledger or release field in every deletion event is configured.
- Route diagnostics deliberately exclude UUID/email, payloads, SDK messages/details and raw errors. Logger redaction covers authorization/cookie/set-cookie paths. This does **not** certify that all generic logs are secret-free: the global error handler logs `{err}`, including potentially unsafe parser/framework error properties. Retain only reviewed, sanitized extracts.
- No dedicated per-step “started”, Auth acknowledgement-shape, response-generated, client-received or durable operation record exists here. A missing completion event may mean an earlier failure, logging/filtering/retention loss, not proof of nondeletion. Retention duration and completeness are not established.

## 9. Proposals — not current guarantees or implemented changes

Subject to separately approved implementation, privacy review and web/API agreement:

1. **Minimal public outcome clarification:** keep current authentication/confirmation and exact success envelope. Add an explicit, versioned error outcome distinguishing not-started from unconfirmed; optionally expose sanitized `stage` and `retryable:false` for ambiguous/partial results. Do not map an unexpected Auth acknowledgement directly to successful erasure or claim verified partial state without evidence. Remove unsafe “try again” advice for unconfirmed cleanup.
2. **Safe correlation:** generate an unpredictable, globally unique server request/operation identifier, expose it in a CORS-readable response header and include it in structured events. Do not trust arbitrary inbound strings or embed account IDs. Add release fingerprint and deployment/process identity to events.
3. **Minimum diagnostic sequence:** sanitized timestamps/durations and events for validation rejection, cleanup start/confirmed/unconfirmed, Auth start/acknowledged/unconfirmed, deletion operations confirmed, response generation, server finish and connection close/error. Record only safe code, acknowledgement-shape category (e.g. UUID present/matching, not values), stage, cleanup state, outcome and HTTP status. Distinguish server finish from client receipt; an optional client acknowledgement must not reverse deletion status.
4. **Post-operation failure isolation:** ensure diagnostic failure does not turn acknowledged deletion into a misleading deletion-failure classification; separate response/delivery failures from operation results. Review global raw-error logging for sensitive fields. Never log bearer tokens, cookies, keys, passwords, raw auth rejection bodies or account payloads.
5. **Reconciliation before retry:** design a privacy-minimal, access-controlled, expiring operation record/support lookup if needed to resolve lost acknowledgements after Auth disappears. This is not existing idempotency support. Verify hosted Auth/SDK semantics read-only before changing its result gate; do not relax that gate solely because two identities are absent.

No proposal was implemented, released or tested destructively as part of this handoff.
