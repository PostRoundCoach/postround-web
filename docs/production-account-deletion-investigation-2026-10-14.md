# Production account deletion investigation — 2026-10-14

## Outcome and scope

**Root cause unresolved; actual-production account state unknown.**

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

### Read-only observations in this investigation

| Observation | Result | Interpretation limit |
| --- | --- | --- |
| Integration directory | One Supabase connection is attached; three additional Supabase connections are not attached. | Other connections' project identity/access suitability was not established; none was attached. |
| Replit deployment metadata | Public autoscale deployment at `https://postroundcoach-web.replit.app`; current build reported successful. | No serving API release ID/commit or original request correlation was provided. |
| Vercel deployment metadata | HTTP 200 for `dpl_9gWd7gEjMHDVTCSajsvoqrXfAovn`; `READY`, production target; alias list includes `www.postroundcoach.com` and `postroundcoach.com`. Git commit: `377a42e60476a30cf84ea7f3820a16f5fb4846b2`. | Identifies the cited web deployment, not the authoritative Express API release or historical alias assignment at the request time. |
| Attached Supabase identity check at 15:25:55 UTC | `HEAD /rest/v1/` returned HTTP 404 with `sb-project-ref: pcyhnijyfzmgyghrzlyp`. | This is a root-endpoint HEAD status, not an Auth-account lookup or deletion status. Project mismatch was reconfirmed; no account/catalog reads followed. |
| Deletion-specific Replit log search | Queried after `2026-10-14T00:00:00Z`, before `2026-10-15T00:00:00Z`, matching `(?i)(/account/delete\|Authenticated account deletion)`; no logs found. | Query reflects logs available when run, not guaranteed full-day or all-release coverage. No original event timestamp, status, stage, diagnostic or request ID was found. |
| Unfiltered Replit log search for the same interval | Logs were returned; 36 nonempty formatted lines, 5 lines mentioning `healthz`, zero lines mentioning deletion route/message. Raw contents withheld. | Line counts are not request counts. Health references are not evidence that deletion reached this deployment. |
| DNS CNAME reads at 15:26:10 UTC | No CNAME result obtained for either API custom domain or Replit hostname. | Does not establish absence of DNS routing; no historical serving release can be inferred. |

No incident HTTP status or diagnostic/error code has been observed. The only
new HTTP statuses above are investigation metadata/identity-check responses,
not the failed deletion response.

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
   `service_role`. Effective live privileges/ownership remain unverified.
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

**Unavailable live comparison:** cleanup body/owner/security configuration,
effective role execution grants, trigger definitions/enabled state, foreign-key
actions, required schema and migration ledger. The mismatched connector is not
valid evidence for any of these on the account's project. Replit's managed
production SQL facility is not access to this external Supabase database.
No function was invoked to test its existence or behavior.

The older `059` cleanup does not remove referral attribution. If that body
remains installed alongside an attribution row and the referral FK, profile
deletion would be blocked. This is a **conditional source-based hypothesis**,
not an established production finding.

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

Request sanitized existing evidence, not a reproduction:

1. Original attempt timestamp/timezone, request identifier if available, HTTP
   status, existing stage/diagnostic/error code, and the actual API serving
   deployment/release at that time. Restrict excerpts to this request; do not
   provide tokens, cookies, keys, raw Auth rejection bodies or credential-bearing
   HAR files.
2. From an authorized operator of `kdumquoyqldqphkysmto`: project identity and
   access-scope confirmation, designated-identity Auth existence result, and
   narrowly filtered account-owned record counts. No unrelated identities or
   record contents are needed.
3. Read-only installed cleanup definition, owner/effective grants, erasure
   trigger definitions/enabled state, relevant FK delete behavior, and existing
   migration-ledger evidence where available. Do not invoke cleanup or change
   permissions to obtain these.

**No implementation or deletion retry is justified by current evidence.**
If historical request/database evidence confirms the old cleanup function caused
the failure, propose only a separately reviewed function amendment matching the
referral-aware contract, with isolated non-production validation and the project's
documented migration workflow. Do not remove immutability triggers or restrictive
FKs and do not blindly replay legacy migrations.

If another stage is established, target only that proven stage. A final Auth
failure after committed cleanup requires a separately authorized, identity-scoped
recovery assessment, not a blind retry. A confirmed completed deletion with client
failure requires response/UI handling review rather than more deletion.

Any implementation, rollout, access/configuration change or destructive recovery
requires separate authorization.
