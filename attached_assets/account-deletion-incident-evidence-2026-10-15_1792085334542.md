# Account deletion incident evidence — October 15, 2026

## Conclusion and scope

**The reported original incident's production root cause is not established.** Retained deployment logs do establish three October 15 deletion requests with HTTP 500 and diagnostics `stage=auth_deletion`, `errorCode=unexpected_auth_result`, `cleanupState=confirmed`, `partialCompletion=true`. These identify an acknowledgement-validation failure in the source-matching branch, **not** proof that Auth deletion itself failed. No retained identifier/time supplied for the user's original attempt selects one of these three requests.

The source contract is [User Account Deletion Contract](user-account-deletion-contract.md). That document separates current wire behavior, repository SQL intent, ambiguities, client responsibilities and future proposals.

This investigation used existing repository files/history, existing deployment metadata and read-only retained deployment-log retrieval. It did not run the app/server, make a new HTTP deletion/health request, execute SQL/RPCs, access account records, run destructive staging tests, build, restart or deploy. Only the two new documentation files were added.

## 1. Evidence classification and references

| ID | Evidence and provenance | What it can establish |
| --- | --- | --- |
| U1 | `attached_assets/Pasted--Post-Round-User-Account-Deletion-Contract-and-Producti_1792078217633.txt:11–25` | User-supplied incident facts and separate-project claims; not an exported browser request, database snapshot or inspected Vercel artifact. |
| R1 | Read-only deployment-log retrieval on October 15, 2026: UTC window `[2026-10-15T00:00:00Z, 2026-10-16T06:00:00Z]`, filter `account_deletion\|Account deletion\|/api/account/delete` | Retained API request and operation diagnostics. Safe extracts are preserved below; no raw authentication body or account identity retained. Window covers the UTC day and the full America/Regina calendar day (UTC−06:00); future hours are merely an upper search bound, not evidence of retention. |
| R2 | Same window, filter `release\|sha256\|commit\|deployment\|Starting\|listening\|Unhandled route error\|account_deletion_completed`; additional unfiltered retained-log search `12:49:00Z–12:52:00Z`, retaining only startup/release metadata lines | Startup context, absence of matching release/completion/global-error records in returned results. Not proof of log completeness. |
| M1 | Current read-only deployment metadata returned during this investigation | Public autoscale deployment; primary `https://api.postroundcoach.com`, alias `https://post-round.replit.app`, successful-build flag true. Not historical deployment ID, commit, request Host or fingerprint. |
| G1 | Read-only Git history, checkout `6b11475d75d747c3ff5c0968a9a649444668b59f` | Source/history context, not platform-certified serving-release provenance. |
| S1 | API route, middleware, logger, release and build/config source listed in the contract §1 | Current authoritative repository behavior. Source branch interpretation is distinguished from log facts below. |
| D1 | `supabase/production/web_sources/202609250001_creator_referrals.upload.sql:140–197`; `WEB_SCHEMA_RECONCILIATION.md`; `DATABASE_FUNCTION_INVENTORY.md` | Repository cleanup definition and dependencies, not hosted function/ACL/trigger state. |
| T1 | `artifacts/api-server/src/routes/__tests__/account.delete.test.ts` | Existing mocked branch expectations. Inspected only; no tests run. No production or historical proof. |
| X1 | Existing `docs/account-deletion-contract.md`; `docs/creator-studio-release-verification.md` | Earlier implementation/release guidance and a different, earlier read-route investigation. Not incident request or deletion-release verification. |

Log references R1/R2 describe the actual retained-log queries, not application-generated fixtures. Their sanitized extracts below are the retained handoff evidence. No raw HAR, credentials, cookies, tokens, account UUIDs or upstream authentication rejection bodies are included.

### User-reported facts, explicitly attributed (U1)

- The user tested deletion through the Vercel `main` web deployment on October 15, 2026.
- The UI displayed: “Account deletion did not complete. Some data may have already been removed. Please contact support before making another request.”
- The user independently checked production Supabase and reported **both the user's profile and Supabase Auth identity deleted**. No underlying query/screenshot, observation time, securely correlated subject or broader table/store inventory was supplied here. This is a reported production observation, not an independent database verification by this investigation.
- The current Vercel main build was reported verified at commit `9305b12877a9d43ce1e3ede5e567a33376430e3a`, containing the merged correction separating confirmed deletion success from subsequent local sign-out errors. The commit belongs to the separate web project; it is not the API commit. No retained mapping establishes that exact web build served the original attempt.
- Another project's comparison API/offline demonstration reportedly allows failure after deletion work if later logging/response handling throws. That is a possible mechanism only. No comparison-project source/tests were inspected or treated as authoritative production evidence.

## 2. Timeline

All machine times below are retained-log timestamps in UTC. Regina local time is UTC−06:00 on this date. Ordering across source history, platform log ingestion and browser events must not be assumed from date alone.

| UTC | Regina | Evidence-backed event |
| --- | --- | --- |
| October 14, 16:29:47 | October 14, 10:29:47 | G1 history records source commit `ee9ca11…`, “Restore verified-user account deletion endpoint with strict cleanup gating, safe diagnostics and mocked tests.” Source change history only. |
| October 15, 12:50:24.311–12:50:25.208 | 06:50:24–06:50:25 | R2 records monorepo artifact startup, API port 8080, and `Server listening`, PID 21. No deployment ID/commit/fingerprint was returned. This was an already retained startup, not a startup performed by this task. |
| 12:50:41 | 06:50:41 | G1 checkout's latest commit is labeled “Published your App.” This label/time does not prove which artifact served any request. |
| 12:57:29.708 | 06:57:29.708 | R1: OPTIONS `/api/account/delete`, request ID 3, PID 21, status 204. Nearby preflight, not proof of the user's browser or association with a particular POST. |
| 12:57:30.308 | 06:57:30.308 | R1: POST diagnostic for request ID 4, PID 21: Auth-stage unexpected result after confirmed cleanup. |
| 12:57:35.479 | 06:57:35.479 | R1: same PID/request ID/method/path, response lifecycle log records HTTP 500. |
| 13:45:57.071 | 07:45:57.071 | R1: OPTIONS, ID 9, PID 21, same path, 204. |
| 13:45:57.612–13:45:57.613 | 07:45:57.612–07:45:57.613 | R1: POST ID 10, PID 21, same Auth-result diagnostic, followed by HTTP 500. |
| 15:10:34.193 | 09:10:34.193 | R1: OPTIONS, ID 18, PID 21, same path, 204. |
| 15:10:34.732–15:10:34.733 | 09:10:34.732–09:10:34.733 | R1: POST ID 19, PID 21, same diagnostic, followed by HTTP 500. |
| 15:57:56.928–15:57:57.521 | 09:57:56–09:57:57 | R2: another retained artifact startup/listening, PID 23. It does not establish whether this was a new release or a process restart. |
| October 15, exact time unavailable | Exact time unavailable | U1 reported UI failure and absent profile/Auth identity. Cannot place these observations against one of the three logged POSTs. |
| October 15, investigation retrieval time not separately captured | Not established | M1 current metadata and R1/R2 retained logs retrieved read-only. Retrieval date is not request/release provenance. |

No record establishes that the three POSTs are retries, the same person, or the reported user's attempts. Do not use nearby OPTIONS, startup time or a small request ID to make that claim.

## 3. Sanitized recovered request records

R1 returned the following deletion diagnostics verbatim in substance (only safe fields retained):

| Diagnostic UTC | PID | `requestId` | Method/path | `event` | `stage` | `errorCode` | `cleanupState` | `partialCompletion` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12:57:30.308Z | 21 | 4 | POST `/api/account/delete` | `account_deletion_failed` | `auth_deletion` | `unexpected_auth_result` | `confirmed` | true |
| 13:45:57.612Z | 21 | 10 | POST `/api/account/delete` | `account_deletion_failed` | `auth_deletion` | `unexpected_auth_result` | `confirmed` | true |
| 15:10:34.732Z | 21 | 19 | POST `/api/account/delete` | `account_deletion_failed` | `auth_deletion` | `unexpected_auth_result` | `confirmed` | true |

Associated R1 HTTP lifecycle records:

| Lifecycle log UTC | PID/request ID | HTTP | `responseTime` as logged | Lifecycle message and safe error |
| --- | --- | --- | --- | --- |
| 12:57:35.479Z | 21 / 4 | 500 | 428 | `request errored`; `Error: failed with status code 500` |
| 13:45:57.613Z | 21 / 10 | 500 | 312 | Same |
| 15:10:34.733Z | 21 / 19 | 500 | 307 | Same |

The returned stack for each lifecycle error points to pino-http's `onResFinished`/`onResponseComplete` and Node response `onFinish`, not to a deletion throw. The logging library synthesizes an error for status 500. That does **not** demonstrate that serialization or delivery failed. The server finish path was observed, not client receipt.

The first diagnostic-to-lifecycle timestamp gap is about 5.17 seconds, while `responseTime` is 428 (pino HTTP milliseconds). These measurements do not align as one elapsed interval. Preserve them without “correcting” them; buffering/collection/event timing has not been established. Request start timestamps cannot be reliably reconstructed by subtracting the duration. No exact browser/request start time is recovered.

Correlation within these returned records uses PID + request ID + method/path + close timestamps. The hostname is only `localhost`; pino defaults use process-local counter IDs, and PIDs can repeat across instances. This is supporting linkage within the returned stream, not a globally unique trace. Correlation of any record to **the original reported attempt remains unestablished**, because no matching browser timestamp/request identifier/account mapping was provided.

## 4. Requested incident evidence inventory

“Not returned” means absent from the queried records, **not** proven expired or never retained. “Not accessible here” means a source/access path was not attached or supplied. “Not established” is a conclusion that the available evidence cannot support. No evidence item's retention expiry was verified.

| Requested item | Recovered evidence | Original-attempt limitation/status |
| --- | --- | --- |
| Timestamp/timezone | R1 UTC diagnostic and lifecycle times, converted above to Regina | Original request start/time and mapping to one candidate **unavailable/not established**; retention status unknown. |
| Request/correlation/trace ID | IDs 4, 10, 19 with PID 21 in R1 | Global trace/client-visible ID and original-attempt ID **not returned/not established**. |
| Destination | M1 current production API origin and alias | Incident request Host/origin, Vercel proxy/rewrite destination **not accessible in supplied browser/web records; not established**. Current origin is not retrospective proof. |
| Endpoint/method | R1 explicitly records POST `/api/account/delete` | Verified for candidates, not uniquely linked to U1. |
| HTTP status | R1 records 500 for all three POSTs; nearby OPTIONS 204 | Candidate server statuses recovered; original browser-observed HTTP status **unavailable**. UI text is not a status code. |
| Public `ok` | No response body captured in R1 | Original value/presence **unavailable**. Current source omits it on failure; not a captured production-body fact. |
| Public `deleted` | No response body captured in R1 | Original value/presence **unavailable**, same distinction. |
| Public `stage` | R1 diagnostic stage `auth_deletion` | Public field **unavailable** for original response; current source does not emit it. Internal log field is not wire evidence. |
| Public `retryable` | None returned | Original public field **unavailable**; current source does not emit it. No retry permission inferred. |
| Public error code/message | U1 UI text; R1 internal `unexpected_auth_result` | Exact production JSON **unavailable**. Internal code is not a public code. Source-inferred body is discussed below, not claimed captured. |
| API deployment ID / release / serving commit | M1 current deployed/build-success flags; R2 startup; G1 history | Historical deployment ID, fingerprint, artifact/commit mapping **not returned/not established**. No historical release-manifest access was supplied. |
| Operation diagnostics | R1 stage/code/cleanup state/partial flag for candidates | Exact returned Auth response shape, SDK error/result, provider request ID and per-table state **not retained in these logs**; no proof they were unavailable in all other systems. Original-attempt linkage unresolved. |
| Response generation | R1 status 500 and server finish-path log for candidates | Strong server-lifecycle evidence, but exact generated bytes **not retained in these records**. Original response and generator failure **not established**. |
| Completion logging | R2 returned no `account_deletion_completed` or `Unhandled route error` matches | No positive completion/global-error evidence from search. Absence is not proof of completeness or no logging failure. |
| Delivery / connection / browser parsing | Server finish-path observed for candidates | Proxy/browser receipt, connection error, response parsing, local sign-out/navigation error **unavailable/not established**. |
| Hosted function/constraints/grants | D1 repository intent only | Hosted and incident-time definitions **not verified**; no authenticated target-mapped metadata connection established. |
| Profile/Auth absence | U1 user report | Independent readback, observation timestamp, subject correlation and complete-store erasure **not established**. No account lookup or mutation was performed. |
| Vercel commit | U1 reports `9305b128…` current main | Current build claim retained as user report. Incident-serving web build/API target **not independently verified**. |

### Access and search boundaries

- Current deployment metadata and retained runtime logs were accessible through the project's read-only publishing tools. No API request was made to reproduce failure. Filters were narrowed to deletion activity and release/error context, then the first startup was checked with a bounded search. No usable original-attempt identifier was available for further unique refinement.
- Integration discovery found Supabase and Vercel connections **not attached** to this environment; multiple Supabase connections could not safely be target-mapped from available evidence. No connection was attached, no credentials retrieved/requested, and no external account selected. This is an access/target-verification limit, **not** proof that those services lack historical records.
- No historical release manifest or deployment-ID-to-artifact mapping was returned by the available current metadata/log queries. An existing local `dist/` is not historical serving-release evidence and was not executed or rebuilt.
- Searches of relevant repository deletion documents/source/history found no original browser request export or original release mapping. Existing earlier Creator Studio verification concerns a different date/flow and cannot supply either. No broad raw log dump or older unrelated uploaded Auth logs was substituted for incident evidence.
- Hosted Supabase catalog/Auth audit readback, Vercel request history and browser receipt evidence remain uninspected. No “not retained anywhere” conclusion is justified.

## 5. Source interpretation versus production facts

Current S1 has exactly the diagnostic combination recovered in R1:

1. Await cleanup RPC.
2. Require no error and exact positive cleanup result fields.
3. Await Auth `deleteUser(verifiedUserId)`.
4. If there is no SDK error but `data?.user?.id !== verifiedUserId`, emit `unexpected_auth_result` with confirmed cleanup, then attempt HTTP 500 with:

   ```json
   {"error":"Account deletion could not be completed. Please contact support."}
   ```

This is a strong source-consistent explanation of the **logged branch**. It does not recover the actual response bytes, the unexpected returned value or the historical serving bundle. No code change should be based on assuming the value was null, empty, the wrong UUID or a particular provider schema.

The installed local Supabase Auth SDK's `GoTrueAdminApi.deleteUser` defaults to hard deletion and transforms a response with `_userResponse` (`src/GoTrueAdminApi.ts`, `src/lib/fetch.ts` within the installed `@supabase/auth-js` package). That transform uses `data.user ?? data`; the API additionally requires a matching UUID. This explains why a fulfilled call alone does not satisfy the route. It does not establish incident-time SDK version, upstream behavior, actual payload, or whether deletion completed in Auth. No upstream rejection body was retrieved.

The observed failure code is different from a completion-logger throw in current source: completion logging occurs **after** this mismatch gate, and these logs show the gate failure. This makes acknowledgement validation the supported failure point for the candidate records, rather than the separately hypothesized post-completion logging exception. However, the records cannot prove which candidate, if any, is U1's incident; nor do they prove that no other logging/delivery problem occurred.

### Outcome assessment

| Outcome | Assessment |
| --- | --- |
| Confirmed complete | No candidate success response/completion event was recovered. U1's two missing identities are insufficient to certify full required cleanup or all-store erasure. |
| Confirmed incomplete before deletion | Not supported for the three candidates: their diagnostics explicitly say cleanup confirmed. A generic 500 does not mean nothing changed. |
| Partial deletion | Possible. Logs mark partial completion because cleanup was confirmed and Auth confirmation failed; this flag does not prove Auth identity remained. |
| Unconfirmed full outcome | Supported classification for handoff: cleanup acknowledged in candidate logs; actual Auth result and full coverage unknown; original-request association and exact browser response unknown. |
| Deletion performed but error returned | Consistent with U1 and the source mismatch branch, but **not proven for the original request**, and not proof of universal erasure. |
| Cleanup transport ambiguity | A real source failure possibility, but the candidates logged cleanup confirmed, not unconfirmed. No positive evidence makes it their failing stage. |
| Lost Auth acknowledgement/result mismatch | Source-supported possibility, with result-mismatch diagnostic recovered. Actual provider response/identity state for each candidate remains unknown. |
| Failure after both deletion operations succeed | Possible through logging, response generation, error middleware or connection problems. Not established for the original incident. Current candidate diagnostics point earlier, at Auth-result validation. |

## 6. Web expectations and API differences

- The source endpoint is `POST /api/account/delete`, verified Supabase bearer session, exact JSON confirmation `"DELETE"`. It selects only the verified UUID.
- Source success is exactly HTTP 200 `{"ok":true,"deleted":true}`. Handled errors expose only an `error` string. Internal `stage`, `errorCode`, `cleanupState` and `partialCompletion` are not public. `retryable` is not implemented. A web assumption requiring these fields would disagree with current source; no inspected web code proves it makes that assumption.
- U1's UI text is not any source route's exact error body. It may be a web mapping; the mapping and actual response are not recovered here.
- The reported web correction prevents local sign-out failures from replacing previously confirmed deletion success. It cannot turn a real API 500 or lost response into confirmed success. No sign-out error was recovered.
- Another API's post-success throw tests, T1's mocked success/failure cases, a current health response, a local bundle and G1's publish label cannot establish original production behavior. T1 was not executed; no fresh synthetic incident evidence was generated.
- The earlier endpoint note says handled errors are JSON and “only complete success returns 200.” The expanded contract qualifies this as positive acknowledgements of the configured cleanup/Auth operations, not universal erasure or guaranteed delivery. Its cleanup error still says “try again”; the expanded safe client guidance explicitly forbids blind retries where state is unconfirmed.

## 7. Root-cause status and smallest safe next step

**Established:** three retained candidate requests ended at server-recorded HTTP 500 with cleanup-confirmed/Auth-unexpected-result diagnostics. Current source contains a matching strict acknowledgement gate.

**Not established:** which request was the original incident, the incident-serving API/web artifact, hosted cleanup definition, exact Auth response, exact public body received, all required data state, or causal explanation of why the Auth result did not meet the gate. The original incident is **not resolved** by identifying a plausible branch.

The smallest safe next step is evidence correlation, **not another deletion attempt**:

1. Have an authorized owner inspect already retained browser/Vercel request metadata for the existing attempt and provide only a sanitized UTC time range, destination/method/path, HTTP status, response field presence/types and existing request/release identifier. No HAR files, tokens, cookies or credentials; do not repeat deletion if records are missing.
2. Match that evidence against R1's PID/request/time tuples; obtain an existing API deployment/artifact fingerprint or historical build record tied to the matched time. Preserve uncertainty if no unique mapping is possible.
3. Through separately authorized read-only access to the verified hosted target, inspect existing Auth audit/provider request metadata and catalog definitions/ACLs. Retain only safe acknowledgement-shape/operation-status metadata and coverage findings, not raw identities or authentication bodies. Do not run cleanup or change grants. Current readback is not an incident-time snapshot.

If those records were never retained or have expired, document that based on the responsible system's retention evidence; the historical root cause may remain unknowable. Do not manufacture certainty with a new request or relax identity/result checks to make the symptom disappear.

## 8. Separately labeled proposals and handoff

The contract §9 proposes, but does not implement:

- explicit unconfirmed/not-started outcomes and safe no-retry wording while preserving the current success envelope and protections;
- globally unique client-visible correlation and release-aware safe operation/response-lifecycle diagnostics;
- isolation of post-operation logging failures and privacy-minimal reconciliation before any retry.

Existing staging/release-verification work remains separate. Any future instrumentation, API/client change, readback requiring new access, destructive test or remediation must be separately approved and scoped.

**Safety confirmation:** no application/test/dependency/environment/configuration/schema/grant/function/migration changes; no account or record creation/modification/deletion; no deletion requests or retries; no SQL/RPC execution; no app startup, build, restart, staging deletion, deployment or publishing. Documentation-only changes are the two files linked in this handoff.
