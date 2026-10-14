# Production account deletion investigation — 2026-10-14

## Outcome and scope

**Root cause unresolved; actual-production account state unknown.**

**Read-only follow-up outcome: stopped at the owning-project access gap.**
The authoritative API belongs to the separate Post Round app project in Replit,
not this marketing workspace's API artifact. No verified link/project ID for
that app is present in the assignment or the inspected project documentation.
The available documented deployment callbacks are scoped to the current repl;
they do not accept a target app-project ID. The documented Replit Admin API
provides a project directory, but its required `REPLIT_API_KEY` is absent here
(secret-existence metadata only was checked; no credential value was accessed).
A documentation/capability search supplied no other authorized project-directory
route. This is an access/discovery limitation, not proof that the app is absent,
undeployed or inaccessible to its owner.

No request was made to the workspace API, workspace Supabase connector, owning
API deletion endpoint, or Supabase during this follow-up. Only this report and
the investigation-scope memory were updated; application code/configuration and
all remote resources remain unchanged. The previous investigation observations
below are retained as historical evidence, not new observations from the app.

This report concerns the single identity designated in the investigation
assignment, reportedly created through `/r/prcoachtest` on the Free plan.
The account identifier is deliberately omitted from this committed report.
The user confirmed uppercase `DELETE` and reported failure roughly five minutes
before the original investigation. Neither the exact event timestamp nor its
timezone/request identifier has been correlated.

The investigation was read-only. No deletion request, cleanup RPC, bearer replay,
account creation, sign-in/session operation, production write, deployment,
connection attachment/reconfiguration, permission change or application change
was performed. Upstream authentication rejection bodies and secret values were
not read. No raw credential-bearing logs or unrelated account records are
included here.

## Evidence register

### Evidence supplied with the assignment

These were previously verified observations, not newly executed deletion tests:

| Evidence | Established fact | Interpretation limit |
| --- | --- | --- |
| Public production `/delete-account` bundle | Sends `POST https://api.postroundcoach.com/api/account/delete` with bearer Authorization, JSON Content-Type and only `{"confirmation":"DELETE"}`. | A deployed request contract is not proof that the reported request reached the API. |
| Built-in public Supabase origin | `https://kdumquoyqldqphkysmto.supabase.co`. | Does not independently identify the API release's connection or configuration. |
| Previously attached Supabase reads | Project header was `pcyhnijyfzmgyghrzlyp`; designated-identity Auth lookup returned 404 and filtered profile/attribution/round/story/permission/telemetry reads returned no rows. | Wrong project. These results cannot establish production absence, deletion success, or the incident's runtime cause. |
| Earlier API/custom-domain and Replit health checks | Both returned HTTP 200. | Health responses do not correlate the deletion request or prove which release served it. |
| Historical authentication diagnostics | Older October 7 failures were documented separately. | They do not explain the new incident; no rejection body was recovered or inspected. |
| User-supplied production catalog observations | `public.delete_own_account_data(uuid)` exists, is `SECURITY DEFINER`, and effective execution grants are limited to `postgres` and `service_role`. Player attribution is removed with transaction-local `postround.account_erasure` enabled before profile deletion; `creator_attributions.user_id` has `ON DELETE RESTRICT`. | Accepted production facts, not independently queried in this follow-up. They do not establish the incident's caller role, full installed return contract or serving release. The obsolete-function explanation is not supported. |

### Historical observations from the preceding investigation

| Observation | Result | Interpretation limit |
| --- | --- | --- |
| Integration directory | One Supabase connection is attached; three additional Supabase connections are not attached. | Other connections' project identity/access suitability was not established; none was attached. |
| Replit deployment metadata | Public autoscale deployment at `https://postroundcoach-web.replit.app`; current build reported successful. | No serving API release ID/commit or original request correlation was provided. |
| Vercel deployment metadata | HTTP 200 for `dpl_9gWd7gEjMHDVTCSajsvoqrXfAovn`; `READY`, production target; alias list includes `www.postroundcoach.com` and `postroundcoach.com`. Git commit: `377a42e60476a30cf84ea7f3820a16f5fb4846b2`. | Identifies the cited web deployment, not the authoritative Express API release or historical alias assignment at the request time. |
| Attached Supabase identity check at 15:25:55 UTC | `HEAD /rest/v1/` returned HTTP 404 with `sb-project-ref: pcyhnijyfzmgyghrzlyp`. | This is a root-endpoint HEAD status, not an Auth-account lookup or deletion status. Project mismatch was reconfirmed; no account/catalog reads followed. |
| Deletion-specific Replit log search | Queried after `2026-10-14T00:00:00Z`, before `2026-10-15T00:00:00Z`, matching `(?i)(/account/delete\|Authenticated account deletion)`; no logs found. | Query reflects logs available when run, not guaranteed full-day or all-release coverage. No original event timestamp, status, stage, diagnostic or request ID was found. |
| Unfiltered Replit log search for the same interval | Logs were returned; 36 nonempty formatted lines, 5 lines mentioning `healthz`, zero lines mentioning deletion route/message. Raw contents withheld. | Line counts are not request counts. Health references are not evidence that deletion reached this deployment. |
| DNS CNAME reads at 15:26:10 UTC | No CNAME result obtained for either API custom domain or Replit hostname. | Does not establish absence of DNS routing; no historical serving release can be inferred. |

No incident HTTP status or diagnostic/error code has been observed. The
HTTP statuses above are prior investigation metadata/identity-check responses,
not the failed deletion response.

### Required domain → release → database evidence chain

| Link | Current evidence | Incident-time evidence |
| --- | --- | --- |
| Browser destination | Supplied public bundle points to `https://api.postroundcoach.com/api/account/delete`. | Original request destination not independently correlated. |
| Domain → owning Replit app | Ownership by the separate Post Round app is supplied; verified project link/ID and authorized domain metadata unavailable. | Domain assignment/routing history unknown. |
| App → serving deployment | Current app deployment ID, deployment time and release history unavailable. Marketing deployment metadata above cannot substitute. | Exact deployment/release, activation interval, rollback history and immutable revision unknown. |
| Release → source/configuration | Local marketing-workspace files are comparison evidence only; owning-app source/configuration was not accessed. | Build/source attestation and nonsecret configuration version unknown. |
| Release → Supabase binding | Owning-app connector ID/version, project reference and effective authority unavailable. Public web origin alone cannot attest the API binding. | Production project binding and connector execution role unknown. |
| Request → logs | Supplied latest accessible snapshot has startup/health checks but no deletion event; owning-app log access unavailable. | UTC instant, request ID, release ID, statuses and stage/error classifications unknown. |

No independently verified serving-release behavior was established. Even a
current binding or current domain response would not prove the October 14 binding.
The prior workspace project `pcyhnijyfzmgyghrzlyp` is development context, not
evidence of the authoritative API's binding.

## Actual-production account-state inventory

All results below are **unknown, not zero**, because correct-project read access
has not been established:

| Account-owned scope | Actual-production result |
| --- | --- |
| Auth identity | Unknown |
| Profile, including local entitlement/preferences | Unknown |
| Original creator attribution | Unknown |
| Rounds and their holes | Unknown |
| Player stories and story permissions | Unknown |
| Content ideas owned through rounds, stories or owned creator identities | Unknown |
| VAD telemetry | Unknown |
| Owned creator identities, social accounts and creator-side permissions | Unknown |

Even a later verified absence does not alone prove prior existence or establish
that this attempt removed the record. Present-state inventory must be paired with
the original request and available historical evidence to assess partial deletion.
Read privilege/RLS scope must also be established before interpreting empty reads.

## Reviewed source semantics — not live database proof

Sources inspected:

- `artifacts/api-server/src/lib/account-deletion.ts`
- `artifacts/api-server/src/lib/creator-content-data.ts` (authentication)
- `artifacts/api-server/src/routes/account.ts`, `src/app.ts`, `src/lib/logger.ts`
- `artifacts/postround-web/src/lib/account-deletion/client.ts`
- `artifacts/postround-web/src/app/delete-account/DeleteAccountClient.tsx`
- `artifacts/postround-web/supabase/migrations/059_account_deletion.sql`
- `artifacts/postround-web/supabase/migrations/202609250001_creator_referrals.sql`
- Profile, admin, creator and story migrations `002`, `003`, `056`, `057`
- `artifacts/postround-web/docs/account-deletion-contract.md`
- `artifacts/postround-web/supabase/creator-referrals.md` and `supabase/README.md`
- `docs/account-deletion-auth-diagnostics.md` (historical evidence only)

The referral migration replaces the older cleanup function. Its intended contract:

1. `SECURITY DEFINER`, pinned `search_path`, required-table checks and a
   transaction-scoped account advisory lock.
2. `EXECUTE` revoked from `PUBLIC`, `anon`, `authenticated`; granted to
    `service_role`. Supplied production evidence establishes the effective
    execution grants (`postgres`, `service_role`); owner and incident caller role
    remain unverified.
3. User-scoped cleanup of ideas, permissions, stories, holes, rounds, telemetry,
   and owned creator social accounts.
4. Transaction-local `postround.account_erasure=on` before attribution deletion.
   The attribution immutability trigger allows DELETE under that flag; otherwise
   mutation is rejected. The creator-slug trigger uses the same erasure exception.
5. Player attribution removed before profile deletion, respecting the attribution
   `user_id` foreign key's `ON DELETE RESTRICT`.
6. Owned creators with referral links detached and anonymized: owner and slug
   cleared, inactive status, generic display name, bio/avatar cleared. Other
   owned creator profiles are deleted. Historical link/event/other-player
   attribution references remain rather than deleting unrelated records.
7. Erasure flag disabled before profile deletion. Cleanup is designed to be
   idempotent; the API removes Auth only after successful RPC completion.

Source foreign-key behavior also includes:

- Profile-to-Auth and player-story/permission-to-Auth `CASCADE`.
- Creator owner-to-Auth and admin audit references `SET NULL`.
- Creator social-account and story-permission dependencies `CASCADE`.
- Profile favorite creator `SET NULL`.
- Referral link-to-creator, event-to-link, and attribution-to-profile/creator/
  link/event dependencies `RESTRICT`.

The RPC has no exception handler that commits partial cleanup. An exception
within its transaction rolls back that transaction's deletes/updates and
transaction-local flag changes. This differs from the **separate** Auth removal
request failing after cleanup has already committed. A lost RPC response also
cannot be used to infer rollback without database/server evidence.

**Unavailable independent live comparison:** complete installed cleanup body and
return contract, owner, trigger definitions/enabled state, other foreign-key
actions, required schema and migration ledger. The supplied function existence,
definer security, execution grants, attribution removal and attribution user FK
are established context, not missing facts. The mismatched connector is not
valid evidence for any of these on the account's project. Replit's managed
production SQL facility is not access to this external Supabase database.
No function was invoked to test its existence or behavior.

### Identity, execution authority and result handling

The supplied/current comparison source has this chain, **not attested to the
incident release**:

1. The browser sends only confirmation JSON and session bearer authorization;
   it does not choose `p_user_id`.
2. The API parses the token's issuer to select an HTTPS Supabase Auth origin, then
   verifies the bearer through `GET /auth/v1/user` with the configured anon key.
   Decoded issuer claims alone are not authentication. Rejection bodies stay unread.
3. The UUID comes from the successful Auth response, then is checked against
   a managed-connector `GET /auth/v1/admin/users/<verified-id>` response (ID and,
   when supplied by Auth, email must match). Project verification failures are
   also reported under the public `authentication` stage.
4. The connector proxy calls the cleanup RPC with that verified UUID. The bearer
   is not forwarded by this RPC call; authority is the managed connector's
   effective credential/role, which has not been proven for the serving release.
   `SECURITY DEFINER` runs the body with the function owner's privileges after
   execution permission is checked; it does not itself grant an unprivileged
   caller permission to invoke the function.
5. `expectSuccess` checks `Response.ok` only and does not parse cleanup JSON.
   On non-2xx it stops before Auth removal, records an upstream-status diagnostic,
   and maps upstream 401/403 to public 503, other non-2xx to public 500.
6. After RPC HTTP success it makes a **separate** connector admin Auth DELETE
   with the same verified UUID; it checks HTTP success only. Whether this was
   reached or succeeded in the incident is unknown.
7. The route returns `{ok:true, deleted:true}` after both calls. The browser
   requires both flags, then awaits `supabase.auth.signOut()` without options.
   The comment says “locally,” but the code does not explicitly request local
   scope. A thrown sign-out failure shares the deletion-error catch; a returned
   sign-out error is not inspected. Neither occurred in observed incident evidence.

The checked-in RPC returns JSON with `cleaned:true`, a round count and
`auth_deletion_required:true` only after all statements succeed, with no
failure-as-success return branch. HTTP-only handling is consistent with that
checked-in contract if normal PostgREST transaction/error behavior applies.
It is **not proven correct for the full installed return contract**: the supplied
catalog facts do not include all return paths/exception handlers. If the installed
function returns a negative/no-op result with HTTP 2xx, the API would still proceed
to Auth deletion. That is a conditional contract risk, not a diagnosed failure
or justification to implement JSON validation now.

### Transaction-local erasure flag

`set_config(..., ..., true)` affects the current transaction, not a persistent
session grant. In the checked-in body, content ideas, permissions, stories,
holes, rounds, telemetry and creator social accounts are deleted **before**
flag activation. Attribution removal and creator detachment/slug changes occur
with the flag `on`; it is explicitly set `off` before the profile DELETE.
The attribution trigger reads it for DELETE and the slug trigger for slug UPDATE.
Neither inspected trigger requires `on` for profile deletion; no other reference
to the setting was found in checked-in SQL. That search cannot attest all installed
production triggers or cascading effects. The restrictive attribution FK is
satisfied by removing that player's attribution first, not by leaving the flag on.

An uncaught SQL error rolls back the RPC transaction, including earlier deletes
and its local setting changes. A separate Auth failure after a committed cleanup
does not undo cleanup. Network/response loss or absent logs proves neither outcome.
No cleanup RPC or setting-mutating query was executed.

## Failure-stage assessment

| Possible stage | Source behavior | Evidence for this incident |
| --- | --- | --- |
| Confirmation | Exact `DELETE` and no extra body keys required; otherwise 400. | User confirmed uppercase; deployed contract supplies expected body. Original request not captured. |
| Issuer authentication | `/auth/v1/user` verification; safe diagnostic `auth_user_status_*`; rejection stops cleanup. | None. No upstream rejection body read. |
| Connected-project identity verification | Admin lookup and identity match; safe diagnostic `connected_project_user_status_*` or mismatch. | None. Workspace mismatch is not proof of the serving API's connection. |
| Application cleanup | Failed RPC reports `application_cleanup`; safe diagnostic contains upstream HTTP status. Reviewed RPC exceptions roll back its transaction. | None. No database SQLSTATE or live function definition available. |
| Auth identity removal | Separate admin deletion after cleanup; failure reports `auth_identity`. Application data may already be gone while Auth remains. | None. Account state unknown. |
| Response/client failure | Client requires successful JSON flags; network/response loss can display failure despite server completion. Local sign-out is inside the same catch path; a thrown sign-out error could display failure after deletion. | None. Requires original response/network and completion/account-state evidence. |

There is no Free-plan eligibility check in the reviewed deletion code. This is
not proof of production-release parity. Authorization, configuration drift,
database constraints, partial deletion and response/UI failure remain hypotheses,
not diagnosed causes.

## Minimum safe evidence request and conditional remediation

The immediate unblock is the **verified Replit link/project ID for the separate
Post Round app**, plus authorized read-only access there to deployment/domain
history, release-specific nonsecret connector bindings and existing incident logs
(or an operator's sanitized export of those exact records). Do not attach another
connection, request secrets or use this workspace deployment as a substitute.

Once that gap is resolved, the missing existing evidence is:

1. Original attempt timestamp/timezone normalized to UTC, destination, request
   identifier if available, HTTP status and stage/diagnostic code; domain
   assignment at that time, deployment/release ID and deployment/activation time,
   immutable source revision/build attestation where retained. Restrict excerpts
   to this request; do not
   provide tokens, cookies, keys, raw Auth rejection bodies or credential-bearing
   HAR files.
2. That release's nonsecret Supabase project reference, connector binding ID/version
   and effective execution authority for RPC and Auth administration. Issuer
   verification configuration must be tied to the same release without exposing
   its anon key or connector credential.
3. Existing correlated API/platform, PostgREST/Postgres and Auth records: safe UTC
   times, request/release IDs, method/destination, HTTP statuses, known stage codes,
   and allowlisted error classifications/SQLSTATE only. Preserve coverage windows
   and retention limits. Do not read raw upstream authentication rejection bodies
   or credential-bearing log payloads. No supported SQLSTATE is currently known.
4. Complete read-only installed RPC return/exception contract and owner, installed
   trigger definitions/enabled state (including profile/cascade triggers), other
   relevant FKs and historical schema evidence if retained. Do not re-request
   proof of supplied catalog facts as though they were unestablished.
5. If needed to assess partial cleanup, narrowly scoped existing designated-account
   existence/count evidence from the independently verified production project,
   with time and read-authority scope. Current absence alone cannot attribute a
   deletion to this request. No unrelated record contents are needed.

**No implementation or deletion retry is justified by current evidence.**
The obsolete-cleanup hypothesis from the previous report is withdrawn in light of
the supplied production catalog observations. Do not remove immutability triggers,
relax restrictive FKs, change grants/connector bindings or replay migrations based
on this unresolved incident.

If a stage is established from existing evidence, propose only the smallest change
supported by that stage for separate approval. A final Auth
failure after committed cleanup requires a separately authorized, identity-scoped
recovery assessment, not a blind retry. A confirmed completed deletion with client
failure requires response/UI handling review rather than more deletion.

Any implementation, rollout, access/configuration change or destructive recovery
requires separate authorization.
