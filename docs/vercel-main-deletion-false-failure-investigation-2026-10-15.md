# Vercel main deletion false-failure investigation — 2026-10-15

> Historical investigation, not current runtime guidance. The later supplied
> October 15 authoritative contract and incident-evidence documents supersede
> earlier assumptions: profile/Auth absence is a user-reported observation, not
> independent verification here; candidate cleanup-confirmed/unexpected-Auth
> diagnostics neither prove Auth failure nor uniquely identify the original
> attempt. Current wire error bodies contain only `error`, not public stage or
> retry fields. See `web-account-deletion-outcome-report-2026-10-15.md` and
> `../artifacts/postround-web/docs/account-deletion-contract.md` for the current
> conservative decision table and verification. Do not use this historical
> report to justify safe retries or universal-erasure claims.

## Scope and evidence rules

**The user's production profile and Supabase Auth identity are confirmed deleted.**
The attachment independently establishes both removals. No account-state queries
were made to repeat that verification. Complete required application cleanup,
HTTP acknowledgment, the incident-serving releases and the responsible failing
operation are not established by those removals.

This is the new report quoting “Some data may have already been removed,” not the
older “Account deletion could not be completed. Please contact support” report or
the earlier 404/authentication investigations. The older reports remain historical:

- `docs/web-account-deletion-outcome-report-2026-10-15.md`
- `docs/production-account-deletion-investigation-2026-10-14.md`

The full request is in
`attached_assets/Pasted--Post-Round-Investigate-False-Account-Deletion-Failure-_1792077345228.txt`.
The separate **Post Round app project owns the authoritative production API**.
This workspace's API is comparison source only. No verified owning-project link
or incident release export was supplied or found in the inspected documentation.

Read-only evidence obtained here: Vercel deployment metadata/history and build-event
summaries through the existing connection; public web HTML/JavaScript; GitHub
source at the immutable Vercel revision; local source/test inspection. No
environment-variable values, credentials, raw HAR, upstream authentication
rejection bodies or raw credential-bearing logs were inspected or exposed.

### 1. Message path and exact predicates

**There is no verbatim match in the inspected current client source or public
deletion page bundle. There is a close wording match:**

| Provenance | Text |
| --- | --- |
| User's verbatim report | “Account deletion did not complete. Some data **may have already been** removed. Please contact support before making another request.” |
| Current source and public bundle | “Account deletion did not complete. Some data **may already have been** removed. Please contact support before making another request.” |

The word-order difference must not be silently normalized into an exact match.
It could reflect recollection or different incident-serving code; neither is
established. There is no incident browser artifact to settle that difference.

Current source path:

1. `artifacts/postround-web/src/app/delete-account/DeleteAccountClient.tsx:34,55–72`
   requires a session, acknowledgment and exact, untrimmed uppercase `DELETE`;
   a synchronous submission latch prevents another submission in the mounted
   component. It calls `requestAccountDeletion(session.access_token)`.
2. `artifacts/postround-web/src/lib/account-deletion/client.ts:31–78` validates a
   configured API origin (HTTPS in normal production, no embedded credentials,
   query, hash or non-root path; no fallback to the Next site), then sends
   `POST /api/account/delete`, bearer authorization, JSON Content-Type and only
   `{"confirmation":"DELETE"}`. No token value is needed for this trace.
3. `client.ts:80–107` parses JSON and classifies status/body. The near-match
   message is the default constructor text at `client.ts:14`, selected at
   `client.ts:94–102`.
4. `DeleteAccountClient.tsx:67–71` catches that error and copies its `message`
   into `errorMessage`; lines 187–190 render it. The client does **not** echo the
   API's arbitrary `error` text. Thus the near-match need not have been returned
   verbatim by the API.

The near-match branch requires **all** of these conditions in the current code:

- Fetch resolves and `response.json()` succeeds.
- `response.ok` is false (outside HTTP 200–299; no particular error status is
  required by the code).
- Parsed `error` is a string, even an empty string.
- Neither parsed `ok` nor `deleted` is boolean `true`. They may be absent,
  false or nonboolean; explicit `false` is not required.
- `stage` is neither exact string `authentication` nor exact string
  `confirmation`. `application_cleanup`, `auth_identity`, `unknown`, missing,
  null or other stage values all select the default text.

The payload must permit those properties; null/primitives/ordinary JSON arrays
do not satisfy the string-error predicate. Returned `retryable`, diagnostic
fields, and arbitrary error wording do not alter classification. Browser errors
are always non-retryable in this implementation.

| Other current condition | Display/classification |
| --- | --- |
| Invalid or missing configured origin, before fetch | “Account deletion is not available.” |
| Fetch rejects, including lost transport/CORS rejection | Unconfirmed outcome, status 0 internally |
| JSON read rejects: empty, malformed or interrupted body | Unconfirmed outcome, response status retained internally |
| Non-2xx with either success flag boolean true, or no string `error` | Unconfirmed outcome |
| Non-2xx/string-error/no true success flags, `stage:"authentication"` | “Account deletion was not authorized…” regardless of numeric status |
| Same, `stage:"confirmation"` | “Account deletion was not submitted: the API rejected the confirmation.” |
| 2xx without both boolean success flags, or with any `error` property | Unconfirmed outcome |
| 2xx + `ok:true` + `deleted:true`, without `error` | Confirmed success |

The unconfirmed text is “We could not confirm the account deletion outcome. Your
account may already have been deleted. Please contact support before making
another request.” A 204 empty response therefore does not select the near-match
default; neither does a 500 containing both true success flags.

After validated success, lines 74–84 set success and clear component identity and
confirmations **before** best-effort `signOut({scope:'local'})`. The helper
`src/lib/account-deletion/post-success.ts` catches returned/thrown SDK failures;
navigation has its own warning boundary. Neither enters the request catch or
selects the near-match. A render/framework exception is not shown to select this
branch either. If the incident used this code and the near-match was the message,
the branch suggests a parsed non-success API response, **not an observed status**.
Those conditions cannot be asserted for the incident without its response/build.

### 2. Verified current Vercel main build and API destination

Existing Vercel connection, read-only `GET /v13/deployments/www.postroundcoach.com`,
followed by the deployment ID detail and production history, returned:

| Field | Verified value |
| --- | --- |
| Project | `postround-web-api-server` |
| Project ID | `prj_cnJGhO44lcxs657XeLbE63NEn2VK` |
| Deployment/build ID | `dpl_DUt1Am7ZMMKazjuRK8sERZy6B2QH` |
| GitHub repository | `PostRoundCoach/postround-web` |
| Git ref / target / state | `main` / `production` / `READY` |
| Immutable commit | `9305b12877a9d43ce1e3ede5e567a33376430e3a` |
| Created | `2026-10-15T14:54:33.433Z` |
| Building | `2026-10-15T14:55:14.464Z` |
| Ready | `2026-10-15T14:55:58.837Z` |
| Alias-assigned metadata time | `2026-10-15T14:55:59.324Z` |
| Assigned public aliases | `www.postroundcoach.com`, `postroundcoach.com` (among listed aliases) |
| Immutable deployment hostname | `postround-web-api-server-px5bcg260-pr-coach.vercel.app` |

Alias assignment is the available activation marker, not proof that every browser
immediately loaded the new bundle. The eight-entry production history has this as
the latest entry; its preceding entry is `dpl_ARqLS6EX63MS1wzHfydywWKRCaoS`,
commit `f7cda47d9638e642a10780e7e8cc8ae3b1c415ce`. Older 404-era deployment
`dpl_9gWd7gEjMHDVTCSajsvoqrXfAovn` is not the current build.

At public response Date `2026-10-15T15:19:53Z`,
`GET https://www.postroundcoach.com/delete-account` returned 200 and script
references tagged `?dpl=dpl_DUt1Am7ZMMKazjuRK8sERZy6B2QH`.
The deletion chunk was fetched successfully:

```text
/_next/static/chunks/app/delete-account/page-72d2d7a2abc3de73.js
SHA-256: 4e7f4090e9bd70c35ea81669735c1f0e8b48945149ca94ab26aacc77d80c975b
```

It contains the near-match message, the unconfirmed-outcome classification,
explicit local sign-out, and the compiled destination:

```text
POST https://api.postroundcoach.com/api/account/delete
body: {"confirmation":"DELETE"}
```

No environment secret was read to obtain that destination. Public artifacts are
better evidence of build-time client configuration than a current environment
setting. The immutable hostname redirected to Vercel's login page (final HTTP
200, title `Login – Vercel`), so it did **not** independently supply an inspectable
deletion bundle. The public alias bundle and deployment metadata are the
available correlation, not a claim to have bypassed deployment protection.

GitHub's contents endpoint at the exact immutable revision returned both
`src/lib/account-deletion/client.ts` and
`src/app/delete-account/DeleteAccountClient.tsx` under `artifacts/postround-web/`.
Both were byte-for-byte equal to this workspace's reviewed source:

| File | Git blob |
| --- | --- |
| `client.ts` | `3f011a0284bd1ef34afb78415712fbc333d59d97` |
| `DeleteAccountClient.tsx` | `50687a92e6a4e4be7e35115ab45783445e92b797` |

**The current deployed main build includes the reviewed merged correction.**
This is source/bundle verification, not a production deletion-flow test.

**Incident-time correlation remains unavailable.** “Latest main” in the report
does not supply the original UTC request time, browser-loaded deployment/chunk
or API request identifier. The current build is a candidate, not independently
proven to have served the incident. The API domain is known as a compiled web
destination; its incident/current owning-app release, activation time, immutable
source and database binding remain unverified. The marketing project's API files
cannot establish them.

### 3. Recovered sanitized response evidence and retention

**No original deletion HTTP status, response body or request identifier was
recovered.** Profile and Auth deletion remain confirmed; this is a response
evidence gap, not an account-state gap.

| Record/source | Available result | Limit |
| --- | --- | --- |
| Latest user report | Quoted UI message; profile and Auth deletion independently verified | No request UTC instant, status, public outcome fields or release ID |
| Current public page/chunk GETs | HTTP 200; build tag, chunk hash, destination above | Static-resource statuses are not deletion statuses |
| Vercel deployment metadata/history | HTTP 200; current build/ref/times above | Not incident runtime records or API release proof |
| Vercel build events, `GET /v3/deployments/<current-id>/events?limit=-1` | 107 available events, stdout/stderr; event times `14:55:14.232Z`–`14:56:18.278Z` on October 15; zero route/completion-message matches | Build events only; no incident response recovered; no raw event text included |
| Owning API runtime/platform/Auth/database records | Not available through verified owning-project access here | No retention window, coverage, request/release match, stage, HTTP status or SQLSTATE established |
| Historical marketing-workspace log searches | Only historical context in October 14 report | Wrong ownership/uncorrelated interval for this latest incident; not rerun as a substitute |

Original public `ok`, `deleted`, `stage`, `retryable` and safe error classification
are all **unavailable**, not inferred negative values. No original browser
network/parsing error or sanitized client stack is available. Vercel build-log
availability says nothing about API runtime retention. Missing access is not
proof that logs expired or that no deletion event exists. No runtime export with
an established coverage window was supplied; no claim of exhaustive log search
is made. Raw response recovery from rejected authentication calls is excluded.

### 4. API operation sequence and post-deletion error paths

**Authoritative serving API source/logs are unavailable.** The following ordering
is the inspected comparison implementation, not production attestation:

1. `artifacts/api-server/src/routes/account.ts:12–22`: exact confirmation and
   no extra body keys; otherwise 400, `stage:"confirmation"`.
2. `src/lib/account-deletion.ts:67–86`: verify bearer through issuer Auth and
   verify identity in the connected project. Identity is derived server-side;
   failures stop destructive calls. Authentication rejection bodies stay unread.
3. Lines 88–97: await connector POST to `delete_own_account_data` with verified
   identity. `expectSuccess` checks HTTP success, not JSON.
4. Checked-in comparison SQL,
   `artifacts/postround-web/supabase/migrations/202609250001_creator_referrals.sql:143–194`,
   checks required schema, takes a transaction-scoped lock, collects owned
   identities, deletes ideas/permissions/stories/holes/rounds/telemetry/social
   accounts, enables the transaction-local erasure flag, removes player
   attribution, detaches/anonymizes linked creators, removes remaining owned
   creators, disables the flag, and **deletes the profile last in that
   transaction**. It returns `cleaned:true` and
   `auth_deletion_required:true`. There is no exception handler committing a
   partial transaction. A SQL exception rolls it back; a lost response does not
   itself establish rollback. The installed production body is not attested.
5. `account-deletion.ts:99–106`: after successful cleanup HTTP status, separately
   await admin Auth DELETE, check HTTP success, then return `{deleted:true}`.
   Auth and SQL cleanup do not share a transaction.
6. `routes/account.ts:25–30`: after that return, call
   `req.log.info({stage:"complete"}, ...)`, then `res.json({ok:true,deleted:true})`.
7. Response serialization/emission must still reach the browser. A synchronous
   `res.json` return or a completion log does not prove browser receipt.

Comparison failure behavior:

- Upstream non-2xx cleanup/Auth responses throw a typed stage error. Upstream
  401/403 map to public 503, other non-2xx to 500. Catch returns string `error`,
  `stage` and `retryable` (true outside authentication), with no success flags.
  That shape reaches the current near-match web branch for cleanup/Auth stages.
- Cleanup commits before Auth removal. A genuine final Auth failure can leave
  application data removed; it must not be called complete. Conversely, an Auth
  service/proxy can finish removal before returning a non-success or losing its
  response; status alone does not locate the irreversible boundary.
- Connector transport exceptions are not converted to a typed stage by
  `expectSuccess`; the route's unknown catch may handle them. That can follow
  already completed remote effects.
- A **completion logger exception after the deletion function returns** enters
  the same broad catch, whose unknown branch attempts HTTP 500:
  `{"error":"Account deletion could not be completed. No success was recorded.",
  "stage":"unknown","retryable":true}`. That shape selects the near-match.
- A synchronous response-generation/write exception before response commitment
  can take that same catch. If headers/body have already started, the catch's
  second response can itself throw or be undeliverable. Later socket/delivery
  failures need not be caught by this async handler at all.
- Catch-path logging can also throw, preventing the intended public JSON.
  Neither the request logger's presence nor its production failure behavior is
  attested for the owning release.
- HTTP-only RPC success checking would be insufficient **if** the installed RPC
  used 2xx for failed/no-op required cleanup. The checked-in SQL has no such
  negative-success return path. Validate the installed return contract before
  recommending response validation; this is not a diagnosed mismatch.

#### Isolated demonstration, not production evidence

The actual comparison `createAccountRouter` handler was invoked in memory with
a mocked deletion function and fake request, response and logger. No server was
started; all external operations were replaced; nothing was persisted. The
deletion mock marked side effects complete before each later fault:

| Injected scenario | In-memory result |
| --- | --- |
| Normal completion | 200, `{ok:true,deleted:true}` |
| Completion `info` logger throws | Attempted 500, string error / `stage:"unknown"` / `retryable:true` |
| First success JSON emission throws before a write | Catch's second JSON call produces the same 500 shape |
| Response throws on both emission attempts, modeling already-started failure | Exception propagates; no delivered acknowledgment established |
| Completion logger and catch logger both throw | Exception propagates; zero JSON calls |

These checks prove a candidate path exists in comparison source. They do not
prove that a production logger threw, a network failed, that required cleanup
completed, or that this implementation served the incident. In-memory
`status(500)` is not an observed wire status, especially after headers start.

### 5. Root-cause assessment

**Production root cause is unresolved.** The following facts are supported:

- The profile and Auth identity are deleted, as independently verified by the user.
- The current Vercel main revision contains the merged post-success web boundary.
- The current public bundle has a near-match API-error message and points to the
  authoritative API domain.
- Comparison source can generate an API failure shape after its deletion
  function returns; a non-success response need not mean records remain.

There is **no direct incident evidence** choosing between a post-deletion API
exception/non-success, response-contract mismatch, response loss/parsing,
different browser/API release, or another defect. Transport/parsing alone would
select different copy in the verified current client; post-success SDK errors
would produce separate warnings. Those are useful conditional distinctions, not
grounds to rule them out for an uncorrelated incident build.

The near-match default is an overconfident description for non-success responses
whose irreversible progress is unknown. That is a supported current-source
messaging concern, not identification of the incident's failing operation.
Neither historical 404 nor authentication diagnostics explain this incident.
Profile/Auth removal does not independently attest every required application
cleanup operation, HTTP success, or responsible release.

### 6. Precise uncertainty and smallest safe next step

Request **existing sanitized records for this one attempt**, not another test:

1. The incident UTC time (or original local time plus timezone, approximate range
   acceptable), and any already-retained browser/request/build identifier.
   If an existing network record exists, have its owner export only method,
   destination, HTTP status and public `ok`/`deleted`/`stage`/`retryable` fields.
   Prefer an allowlisted error category over arbitrary error text. No raw HAR,
   headers, cookies, tokens, account identifiers or authentication rejection body.
2. A verified link/project ID and authorized read-only access to the separate
   Post Round API project, **or an operator's narrowly sanitized export** tying
   that UTC interval/request to the API domain assignment, serving release,
   activation interval and immutable revision. Include safe stage/status codes
   and whether completion was recorded before a response/logging failure.
   State each export's coverage window and retention limit. Inspect the matched
   release's deletion handler and cleanup return contract rather than this
   workspace's substitute.

Start with whichever retained request/time reference already exists; it scopes
the owner lookup and avoids unrelated logs. If only API logs survive, their
request/release correlation may establish the server path but cannot reconstruct
browser receipt. If no original response was retained, explicitly retain that
limitation; an owner-confirmed source review may identify risks without proving
this historical cause. Nonsecret release-to-database/connector authority can be
requested only as needed for the matched cleanup contract; no secrets or new
account-state queries are required.

Do not request that the user verify profile/Auth absence again. Do not retry the
deletion, create an account, invoke cleanup, change permissions or deploy
instrumentation. Current health checks, DNS responses and metadata from the
marketing workspace cannot close the owning-release gap.

### 7. Minimal recommendation and relevant regression coverage

**No application/configuration changes were implemented or deployed.**

The smallest currently supported web recommendation, for separate approval, is
to stop treating every non-2xx/string-error response outside authentication and
confirmation as proof of incomplete deletion. Preserve safe stage-specific
pre-deletion failures where attested; classify an unproven failure response as
**unconfirmed**, with the existing no-retry/support guidance. Do not turn it into
success. If the authoritative contract can positively attest failed required
cleanup, retain a distinct incomplete outcome rather than hiding it as success.

Use these three outcomes:

| Outcome | Required evidence and behavior |
| --- | --- |
| Confirmed complete | Trustworthy success contract after **all required cleanup and Auth removal**, with no contradictory status/body. Show success; session/navigation errors remain separate warnings. |
| Confirmed incomplete | Independently trustworthy evidence that required cleanup/removal did not complete. Explain incomplete cleanup; support recovery, no blind retry or fabricated success. |
| Ambiguous | Response loss, malformed/contradictory contract, generic server error, or post-effect exception without trustworthy completion proof. Say completion cannot be confirmed; no automatic retry. |

For this incident, profile and Auth removal are confirmed while **full cleanup
and HTTP acknowledgment remain unestablished**. Those confirmed removals must
not be downgraded, nor promoted into proof of full cleanup.

An API correction is conditional on inspecting the authoritative matched
release. If it shares the demonstrated broad catch, the smallest supported
direction is to keep nonessential completion logging from changing a confirmed
operation result, separate operation failures from acknowledgment/emission
failures, and avoid a contradictory failure response or retry advice after a
known completion boundary. Do not emit success if required cleanup failed.
Do not attempt a second JSON response after headers have started. No server
refactor can guarantee delivery through a failed connection; that remains an
ambiguous browser outcome. Do not change RPC validation, grants, identity
derivation or cleanup requirements on speculation.

**Existing tests inspected:**

- `src/lib/account-deletion/client.test.ts`: request/destination contract;
  configuration guard; safe API errors; malformed/missing/contradictory/empty
  responses; interrupted streams/transport; authentication/confirmation/
  cleanup/Auth stages; no trust in arbitrary public error text or retry flags.
- `src/lib/account-deletion/post-success.test.ts`: returned/thrown SDK errors
  and synchronous/rejected navigation remain separate from deletion.
- `e2e/delete-account-outcomes.spec.ts`: isolated real-component acknowledgment,
  pending/returned/thrown session cleanup, navigation faults, unexpected
  responses and no duplicate request.
- `e2e/delete-account-confirmation.spec.ts`: exact visible `DELETE`,
  acknowledgment, signed-out/pending guards and real-SDK fixture logout errors.
- API `src/lib/account-deletion.test.ts` and
  `src/lib/account-deletion-regression.test.ts`: authenticated identity and
  cleanup-before-Auth ordering; early failures; unchanged public shapes and
  logging; unread authentication rejection bodies. Their generic error test
  throws inside the deletion function, not after it returns.

**Verification performed for this investigation:**

```text
pnpm --filter @workspace/postround-web exec node --experimental-strip-types --test \
  src/lib/account-deletion/client.test.ts \
  src/lib/account-deletion/post-success.test.ts
7 passed, 0 failed — injected fetch/SDK/router fixtures only.
```

The five in-memory route scenarios above also passed their assertions. They
started no listener/service. Existing browser suites were inspected, not rerun;
earlier report test counts are historical, not new results. No full build or
production deletion flow was run.

For a separately approved correction, retain the existing tests and add:

1. A contract matrix distinguishing complete, positively incomplete and generic
   ambiguous responses, including non-2xx success flags, missing stage, string
   error with no progress evidence, and negative cleanup acknowledgment on 2xx
   **if the authoritative installed contract supports that possibility**.
2. Authoritative route regressions with all external boundaries mocked: all
   required effects complete then completion logger throws; pre-write response
   generation throws; response already started/socket fails; catch logger
   throws. Assert preserved operation outcome, no contradictory second response,
   no automatic deletion replay and no leaked sensitive detail.
3. Keep post-success returned/thrown/pending SDK cleanup and navigation-error
   cases successful; keep genuine required cleanup failure non-successful and
   exact confirmation/authorization requirements unchanged.

These are recommendations, not newly added tests or proof of deployment parity.
Existing evidence retrieval overlaps the already proposed deletion-evidence and
API-release investigations; it should not require a new destructive capture.

## Safety closeout

Only this report was added. No production mutations, database queries, deletion
requests, account creation, sign-in, cleanup RPCs, migrations, deployments,
Android builds, service starts/restarts, application/configuration edits or
credential inspection occurred. The investigation is complete to the stated
existing-evidence boundary; incident causality remains explicitly unresolved.
