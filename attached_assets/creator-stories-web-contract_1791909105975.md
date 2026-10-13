# Creator Stories web contract — reconstructed report

**Reconstruction date:** 2026-10-13 UTC. Current repository source inspected at approximately 16:25 UTC.
**Evidence scope:** documentation and local source inspection only; no fresh production verification.

This report reconstructs the requested missing artifact, not its original wording.
The original `.local/reports/creator-stories-web-contract.md` was absent when the
relationship-remediation investigation began and remains absent before this reconstruction.
Local `git log --all -- .local/reports/creator-stories-web-contract.md` returns no history;
`.local/` is ignored. There is no surviving original report to quote.
Identical copies are retained at:

- `.local/reports/creator-stories-web-contract.md` — original requested location.
- `docs/creator-stories-web-contract.md` — durable, tracked deliverable.

## 1. Executive summary

1. **User-reported Android behavior:** the original specification says the rebuilt,
   installed production Android APK successfully populated History → Stories with the
   expected Shared badge. This is the behavioral reference, not a captured authenticated
   response, proof of installed bundle provenance, or evidence of the web target. [E1]
2. **Current source:** History reads owner-scoped `story_candidates` through
   `GET /api/stories/history`; Studio reads creator-authorized candidates through
   `GET /api/content/stories`, with an independent exact count at
   `GET /api/content/creator-summary`. Neither candidate listing depends on generated
   `content_ideas` or `player_stories`. Their envelopes and permissions differ. [S1–S6]
3. **Recorded production failures:** History logs on October 13 at 13:34:16 UTC and
   Studio list logs at 15:45:52.694Z / 15:46:59.171Z identify `PGRST201` between the
   original story-ID FK and the added candidate-owner composite FK. The follow-up
   independently reproduced the count query's HEAD ambiguity. These are timestamped
   observations from prior reports, not probes performed for this reconstruction. [E3, E5]
4. **Merged source correction:** both current History and Studio source explicitly select
   `story_permissions_story_id_fkey`; Studio retains its inner join, authorization
   filters, response projection, pagination and exact HEAD count. Do not describe the
   former unqualified Studio join as current code or recommend reimplementing its fix. [S3, S5]
5. **Remaining uncertainty:** publication of that correction, serving-source provenance,
   actual Vercel origin/rewrites, signed-in creator data and rendering are not established
   by these records. Owner visibility does not establish creator permission. [E4, E5]
6. **Known fixture:** “Hit every fairway — 6 of 6” must appear with **Shared** for its
   authorized owner when the recorded eligibility/permission conditions hold.
   “Perfect GIR, But Putting Struggles” is a separate generated draft, not this card. [E1, E2]

## 2. Evidence inventory, chronology and limits

### Requirements and historical evidence

| Ref | Source | What it establishes and what it does not |
| --- | --- | --- |
| E1 | `.local/tasks/document-creator-stories-web-contract.md` (full task description); `attached_assets/Pasted--Task-Document-the-Verified-Production-Creator-Stories-_1791906855978.txt` (original specification) | Required read-only scope, independent tracing, user-reported Android success, exact fixture, web failure report. Not original report text or API/browser capture. |
| E2 | `.local/reports/creator-story-history-contract-evaluation.md` | Earlier source-supported probable History ambiguity; recorded shared fixture with granted permission, null revocation and null approval request. Undated evaluation; no authenticated current production response or release identity was available to it. |
| E3 | `.local/reports/creator-story-history-restoration.md`, checked 2026-10-13 14:31 UTC | Direct recorded History production 500/PGRST201 at 13:34:16 UTC; local FK correction/test results; unauthenticated 401 at the metadata-confirmed API host. No authenticated success or serving correction verified. |
| E4 | `docs/creator-studio-release-verification.md`, 2026-10-12 UTC | Local route/bundle and mocked-test evidence; intended configuration; metadata-confirmed `https://api.postroundcoach.com`; health 200 and unauthenticated 401s at 16:10–16:11 UTC, including an unknown-path 401 control. Authenticated contract/release/consumer verification blocked. |
| E5 | `docs/creator-studio-relationship-remediation.md`, 2026-10-13 approximately 16:13–16:15 UTC | Report already missing; Studio list production PGRST201; independent configured-PostgREST GET/HEAD diagnosis; explicit-FK development correction; zero-identity read-only helper verification; development restart only. No signed-in Vercel verification or production publication. |
| E6 | `docs/creator-studio-reads-contract.md`, locally reconciled 2026-10-12 UTC | Canonical implemented Studio envelope/fields/authorization/errors. Source contract, not a claim about the unavailable Vercel consumer or serving release. |
| E7 | `docs/web-creator-dashboard-contract-audit.md`, 2026-09-15 | Historical `/ideas` and rounds audit and separation of player stories. Its old line numbers, schema/production assertions and generation behavior are not fresh evidence for the candidate list or count. |
| E8 | `attached_assets/production-story-history-contract_(1)_1791900407590.md` | Earlier development-derived History handoff; expressly not production inspection. Its personal-best sample is a different example, not a replacement for the E1 fixture. |

### Current source citations

These citations refer to the checkout inspected for this reconstruction, independently of
the dates on prior reports. Function/handler names are used rather than fragile line numbers.

| Ref | Paths and relevant symbols |
| --- | --- |
| S1 | `artifacts/golf-coach/app/(tabs)/history.tsx` (`stories` subtab renders `StoryHistoryList`); `components/StoryHistoryList.tsx` (`StoryCard`, `statusColor`, `StoryHistoryList`) |
| S2 | `artifacts/golf-coach/hooks/useStoriesHistory.ts` (`useStoriesHistory`); `lib/types/stories.ts` (`StoryHistoryRecord`); `lib/apiOrigin.ts` (`getApiOrigin`, `resolveApiOrigin`); `lib/supabase.ts` (`authHeaders`) |
| S3 | `artifacts/api-server/src/routes/stories.ts` (`GET /history`, `candidateStatusLabel`, `deriveDisplayStatus`, permission comparator; `PATCH /permissions/:id/review`) |
| S4 | `artifacts/api-server/src/routes/content.ts` (`GET /stories`, `/creator-summary`, `/ideas`, `/round/:round_id`); `routes/index.ts`; `app.ts`; `middleware/requireAuth.ts` |
| S5 | `artifacts/api-server/src/lib/creatorStudioReads.ts` (`resolveStudioCreator`, `authorizedStories`, `listStudioStories`, `countStudioStories`) |
| S6 | `artifacts/api-server/src/lib/creatorAuth.ts` (`resolveCreatorOwnership`); `lib/storyPermissionCheck.ts` (`ELIGIBLE_STATUSES`, `resolveStoryPermission`); `lib/roundWebContract.ts` (`buildRoundWebContract`, response interfaces) |
| S7 | `supabase/migrations/057_story_candidates.sql`; `061_story_permissions_approval_requested_at.sql`; `supabase/production/adaptations/007_security_controls.sql` (candidate-owner FK and policies); creator schema/capability context documented in E6 from migrations 056/072 |
| S8 | `artifacts/api-server/src/routes/__tests__/content.creator-reads.test.ts`; `src/__tests__/stories.api.test.ts` (read regression assertions inspected, not executed here) |

### Reconciliation over time

- The original documentation task described History's already-qualified permission
  relationship and the then-unqualified Studio helper. That is historical task context.
  E2's still-unqualified History observation predates E3's correction; it is not current source.
- E3 changed History after directly recorded History PGRST201, whereas E5 independently
  diagnosed and corrected Studio list **and** summary. These are different reads.
- E5 records summary logs at 15:45:46.159Z, 15:45:46.233Z and 15:46:49.715Z with empty
  messages and no identifying database code. Those logs alone cannot identify their cause.
  Its separate zero-UUID exact HEAD probe returned HTTP 300/null count/empty message;
  equivalent GET with exact count exposed PGRST201. HEAD suppressing the JSON error body
  explains that reproduced failure and strongly explains, but does not prove, all earlier
  summary failures.
- E5's corrected list/count helpers returned `[]` / `0` against configured PostgREST
  for a probe identity. That verifies dispatch/relationship resolution, **not**
  a real creator's populated authorization or an authenticated published API response.
- E5 records different development and production `X-API-Release` digests.
  That production artifact identifier was not mapped to a source commit. The report
  expressly says its correction was not deployed at that inspection. A later publish
  cannot be inferred from local Git labels, generic build success or elapsed time.
- E3/E4 unauthenticated 401s establish auth-gate reachability, not authenticated handler
  success; E4's unknown-path control also returns 401. Source mount verification and
  production response verification must remain separate.

## 3. Independent Android History flow — current repository behavior

The History `stories` subtab renders `StoryHistoryList`; its hook is a separate
owner archive request, not the Studio hook or generated-content path. [S1, S2]

1. `getApiOrigin()` prefers a defined `EXPO_PUBLIC_API_URL`, validates an HTTPS
   origin without credentials/path/query/fragment, and normalizes its origin.
   An invalid defined value throws rather than falling back. Only when undefined
   does it use legacy hostname-only `EXPO_PUBLIC_DOMAIN` as `https://<hostname>`.
   Missing/invalid configuration fails explicitly. `EXPO_PUBLIC_API_BASE` is a
   separate session override and is not used by this History hook.
2. Hook key is `["stories-history", user?.id]`; `enabled: !!user?.id` avoids a
   pre-auth request. `staleTime: 0`, `refetchOnMount: true`.
3. `authHeaders()` reads the current Supabase session and supplies
   `Content-Type: application/json` plus `Authorization: Bearer <access token>`
   if one exists. User presence alone does not guarantee a valid token.
4. Fetch defaults to **GET** `<API_ORIGIN>/api/stories/history`, with no query
   parameters, body, caller-selected user or pagination.
5. Mount chain: `app.use("/api", router)` → `/stories` router → `/history`;
   router-wide `requireAuth` verifies the token via admin `auth.getUser`. [S3, S4]
6. Admin SELECT explicitly filters candidate `user_id = req.authUser.id`, statuses
   `offered/shared/kept_private/expired`, orders candidate `created_at DESC`.
   It embeds rounds (`played_at`, `course_name`), FK-qualified permissions
   (grant/approval/granted/revoked/creation metadata) and creator display name.
   `candidate` status is excluded. No generated text, completion filter, creator
   permission requirement or public/internal paging loop is used. A database row
   cap can therefore limit this single query; “full history” is not proven unbounded. [S3]
7. Success maps exactly eight fields to `{stories:[...]}`; database query errors
   return 500 `{"error":"Failed to fetch stories history"}` and log
   `STORY_HISTORY_FETCH_FAILED`. Missing related metadata is null, not a failed
   candidate; relationship resolution failure is an error, not empty success.
8. Hook throws on non-2xx; JSON/parsing errors also reject. It uses
   `json.stories ?? []`, with no runtime schema validation, so a malformed 200
   lacking `stories` can look empty. List uses returned headline, not idea title;
   null headline falls back to story type with underscores replaced. Summary/course/date
   are conditional; story type is uppercased with underscores replaced; badge text
   is the server's `display_status`. `creator_name` is returned but not displayed. [S1, S2]

**States and detail:** loading shows a spinner; query failure shows “Could not load
stories.” and “Pull down to try again.” The error branch is a plain View, not the
FlatList with RefreshControl, so that instruction is not evidence of working
pull-to-refresh recovery there. Successful empty data shows “No stories yet.”
Successful lists have pull-to-refresh via `refetch`. Cards are nonpressable Views,
with no detail navigation in this component. Do not invent a mobile detail request. [S1]

E4 records an intended mobile production origin of `https://api.postroundcoach.com`.
Actual installed APK configuration, request hostname and source provenance were not
captured here. User-reported physical-device success remains E1 evidence.

### History permission selection and exact badge precedence

Normalize permission objects/arrays to an array. The executable comparator prefers
**all non-revoked rows over revoked rows regardless of age**, then newest `created_at`
within each group; choose first. “Non-revoked” does not mean granted. A pending row
can win. There is no explicit ID tie-break for equal timestamps. Some comments imply
timestamp-first behavior; the comparator is authoritative. [S3]

| Selected permission condition, evaluated in order | `display_status` |
| --- | --- |
| No row | Candidate label: `offered → Offered`, `shared → Shared`, `kept_private → Kept Private`, `expired → Expired` |
| Truthy `revoked_at` | `Declined` |
| Granted, no approval request | `Shared` |
| Granted, approval request present | `Approved` |
| Not granted, approval requested, no `granted_at`/revocation | `Pending` |
| Otherwise | Candidate label |

Permissions do not bypass candidate inclusion. `Approved` has accent colors,
`Pending` primary colors, `Declined` destructive colors; `Kept Private`, `Shared`,
`Offered`, `Expired` use muted colors. [S1, S3]

Approval timestamps are not interchangeable with grant validity. Migration 061
adds nullable `approval_requested_at`; current review approval sets `granted_at`
without setting `permission_granted`. Creator authorization still requires the
grant boolean and null revocation; timestamps alone cannot admit a candidate. [S3, S7]

## 4. Independent web boundary and verified server contract

**Separate Vercel source unavailable.** No page/component/hook/service, deployed
environment, rewrite rules, signed-in trace, parser, filters, badge/detail rendering
or error-to-empty behavior from that frontend has been verified. The following is
the registered **server-side Studio contract**, not an invented consumer trace. [E4–E6]

### Endpoints, identity and authorization

Both existing GETs are mounted `/api` → `/content`, after router-wide `requireAuth`.
Use case-sensitive `Authorization: Bearer <valid Supabase user access token>`
for the API's configured project. Service-role/anon keys are not user sessions.
No required parameters, GET body, caller-selected creator, filters or public
pagination exist; request identity/capability overrides are ignored. [S4, S5]

`resolveStudioCreator` selects an active creator by authenticated user ID using
`maybeSingle`, then `resolveCreatorOwnership` rechecks ownership and active status.
Multiple active creator profiles fail closed as an initial lookup error (500).
Capabilities are DB-derived: `advancedCreator = Boolean(advanced_creator)`;
`creatorVoice` requires advanced capability and a selected active voice profile.
The helper selects first active voice (`find`), not a voice-row ambiguity error.
There is no follower threshold, credit/usage check, generation or write. [S5, S6]

`authorizedStories` uses this exact current relationship selection for both reads:

```text
story_permissions:story_permissions!story_permissions_story_id_fkey!inner(story_id)
```

It filters candidate status to `offered/shared`, joined `creator_id` to the resolved
creator, `permission_granted=true`, `revoked_at IS NULL`. All conditions must match
the **same permission row**; another creator's grant cannot combine with this
creator's pending permission. Approval timestamps are not additional filters.
Missing/pending/revoked/other-creator permissions and private/expired/candidate
statuses are excluded, not per-item 403s. `draft` is not a candidate-schema status:
generated ideas' draft status cannot suppress an eligible candidate. [S5–S7]

### Responses and schema comparison

All successes below are HTTP 200 JSON. Descriptions are source-derived, not
captured production payloads. UUIDs are JSON strings; timestamps pass through DB
serialization. Nullable History fields are explicit keys, not omitted fields. [S2–S5, E6]

| Surface | Success envelope | Record fields, types and nullability |
| --- | --- | --- |
| Owner History | `{stories: StoryHistoryRecord[]}`; no `ok`/creator/total | Exactly `id: string`, `headline: string \| null`, `summary: string \| null`, `story_type: string`, `played_at: string \| null`, `course_name: string \| null`, `display_status: string`, `creator_name: string \| null` |
| Studio stories | `{ok:true, creator, stories: CreatorStudioStory[]}` | Exactly `id`, `round_id`, `story_type`, `headline`, `summary`, `status`, `created_at`, all required non-null strings under repository schema. IDs UUIDs; `status` admitted values `offered/shared`; type is not a closed enum; `created_at` timestamptz string. No `display_status`, course, player or permission object. |
| Studio count | `{ok:true, creator, summary:{storyCount:number}}` | Exact nonnegative integer count of the same eligible creator-authorized candidates, not ideas, followers, posts or AI usage |

Studio `creator` is exactly `{id:string, name:string,
capabilities:{advancedCreator:boolean, creatorVoice:boolean}}`; `id` is
`creator_profiles.id`, not necessarily the session user ID; `name` is display name.
All fields required/non-null under the expected schema; the handler does not
runtime-validate historical/corrupt database values. [S5–S7, E6]

Empty success preserves its envelope: History `{stories:[]}`; Studio
`{ok:true,creator,stories:[]}`; summary `{ok:true,creator,summary:{storyCount:0}}`.
These are not authorization errors.

**Pagination:** History single descending-created query has no paging protocol.
Studio exhausts internal inclusive ranges of 100, ordered `created_at DESC, id DESC`,
until a short page. It returns no cursor/total/next-page metadata. Summary uses
head-only exact count, not list length; a null count fails, not zero.
Offset pages, creator lookups and separate list/count requests are not atomic;
concurrent changes can shift pages or change agreement. [S3, S5]

### Errors and recommended consumer state handling

Exact ordinary-request server outcomes (JSON error bodies contain only `error`): [S3–S6, E6]

| HTTP | Error string | Boundary |
| --- | --- | --- |
| 401 | `Authentication required` | Missing/wrong-prefix/empty bearer |
| 401 | `Invalid or expired session` | Verification error/no user |
| 401 | `Could not verify session` | Verification throws |
| 403 | `Creator profile not found or inactive` | Studio no active profile or typed ownership helper failure |
| 500 | `Failed to fetch creator stories` | Studio initial DB lookup error/ambiguity, joined read error or other untyped handler failure |
| 500 | `Failed to fetch creator summary` | Corresponding summary failure, including unavailable exact count |
| 500 | `Failed to fetch stories history` | History candidate query error |

The ownership helper's own lookup DB failure is typed and maps to Studio 403,
unlike the initial resolver lookup failure (500). Authenticated unknown content
paths fall through to framework HTML 404 `Cannot GET ...`; without auth even an
unknown path hits 401 first. Do not turn 404/HTML or 500 into empty JSON. [S4, S6, S8]

**Implementation recommendation, not verified web UI:** show loading while reads
are pending; empty only after a validated 200 array; show session recovery for
401, creator-access explanation for 403, visible retryable failure for 500 or
transport/parse failure, and origin/routing diagnostics for HTML/404. Validate the
documented envelope, not aliases like `data` or generated idea titles. Avoid
cross-session cache reuse. Web badges must be explicitly agreed: the list only
provides raw candidate status, so `shared → Shared` and `offered → Offered` are
reasonable proposed labels, **not proven existing rendering**. It cannot derive
History's Pending/Approved/Declined solely from these seven fields.

### Applicable detail reads — server availability, not proven navigation

No new `/content/stories/:id` detail contract is established. Existing reads are: [S4, S6]

- `GET /api/content/ideas?story_id=<candidate UUID>` validates the required UUID
  (400 if invalid), resolves active session creator (403 if unavailable) and uses
  `resolveStoryPermission` (eligible candidate + exact granted/non-revoked creator
  permission; failure 403 `Story permission check failed`). Success is
  `{ok:true,creator,ideas:[...]}`, optionally `creatorVoice` for advanced active voice.
  Ideas are generated `content_ideas` for the story, excluding `status='generating'`,
  newest first; no public pagination. Draft ideas are not generically excluded.
  They contain generated narrative and shaped round/scorecard, not the minimal
  candidate list schema. No ideas can be a legitimate authorized empty success.
- `GET /api/content/round/:round_id` validates UUID (400), resolves active creator,
  then `buildRoundWebContract` requires an eligible candidate and exact granted,
  non-revoked permission. Missing round is 404, denied story access is 403
  `No authorized story access for this round`, DB/build failure 500
  `Failed to build round contract`. Success `{ok:true,contract}` has `round`,
  `roundHighlights`, `scorecard`, `creatorContentStory`, `coachingReflection`.
  The candidate is available independently of generation; its `contentIdea` can
  be null and successful `permissionState` is always `"granted"`.
  Round course/tees/player display name can be null, highlights have nullable
  numbers, scorecard is hole-sorted, reflection is an availability union.
  Use S6's interfaces for full detail-field schemas rather than list-field aliases.
  Stale top-level helper comments suggesting “any permission state” contradict
  executable grant/revocation gates and the literal permission type; do not
  implement pending/revoked access based on those comments.

Detail handlers recheck access; a listed candidate is not a durable permission
grant. Revocation between list and detail may validly cause 403. Which, if either,
the Vercel screen calls remains unknown. Mobile cards do not establish that path.

## 5. Database relationships and permission boundaries

Expected schema, not fresh live catalog introspection: [S7]

- `story_candidates.id` is UUID PK; `round_id` references `rounds.id`, unique per
  round; `user_id` references the player auth user. Required headline/summary/type
  and timestamps belong to the candidate. Status check is
  `candidate/offered/shared/kept_private/expired`.
- `story_permissions.story_id` references candidate ID through
  `story_permissions_story_id_fkey`; permission `user_id` identifies the player,
  `creator_id` references `creator_profiles.id`, whose `user_id` identifies the
  creator's owning session. These identities must not be conflated.
- Adaptation 007 adds unique candidate `(id,user_id)` and composite
  `story_permissions_candidate_owner_fk (story_id,user_id) → candidate (id,user_id)`.
  It enforces matching owner and requires constraint validation in the migration
  logic. E5 verifies relationship presence in the applied PostgREST cache but
  explicitly does not inspect catalog validation flags.
- Partial unique index permits at most one granted/non-revoked permission per
  candidate. Historical revoked or pending rows may coexist, explaining History's
  row-selection logic.
- Migration 057 owner RLS reads own candidates/permissions; creator candidate RLS
  requires a granted/non-revoked link to a session-owned creator. Adaptation 007
  also checks permission/candidate owner equality. Creator permission-row SELECT
  visibility itself is not a content grant. RLS policy state is not freshly verified.
- API admin/service-role queries enforce explicit owner or creator predicates;
  direct-client RLS alone does not secure these server reads. Do not remove the
  filters because RLS exists.

Generated `content_ideas` are downstream story-linked content; their title/status
are not History headline/badge or Studio candidate status. `player_stories` is the
separate player-facing generated first-person product. Its list/detail IDs and
types must not substitute for candidate IDs in these reads. [S2, S4–S6, E7]

## 6. Known fixture and independent eligibility

**Fixture:** candidate headline **“Hit every fairway — 6 of 6”**, expected owner
badge **Shared**. Not the separate draft **“Perfect GIR, But Putting Struggles”**.
E1 defines the expected card; E2 records candidate `status='shared'`, permission
`permission_granted=true`, `revoked_at=null`, `approval_requested_at=null`.
This reconstruction does not newly inspect those records or certify their
continued presence in the database used by the serving API.

- **Owner:** authenticated owner must match candidate `user_id` against the intended
  target/database. The shared status passes History inclusion; the recorded
  player-initiated non-revoked grant gives Shared if selected by the current
  comparator. Missing round/profile metadata does not suppress its headline/card.
  Changes or newer non-revoked permissions could change the derived badge.
- **Creator:** the requesting session must own an active creator profile and that
  **same creator** must have its own granted/non-revoked permission for the candidate.
  Under those conditions the list contains the candidate's headline and raw
  `status='shared'`, and it contributes one to storyCount. Owner success is not
  proof this creator has a grant; a different creator must not see it.
- **No generation dependency:** no draft regeneration, Player Story, script or
  credit consumption is needed for candidate visibility or Shared.

Source-derived partial expectations, **not observed production responses**:
owner record contains `headline: "Hit every fairway — 6 of 6"` and
`display_status: "Shared"`; authorized creator record contains the same headline
and `status: "shared"`. Unknown fixture IDs, summary, type, dates and creator name
are intentionally not fabricated into a purported complete payload.

## 7. Comparison, findings and hypotheses

| Dimension | Android History | Studio server / actual Vercel consumer |
| --- | --- | --- |
| Method/path | GET `/api/stories/history` | GET `/api/content/stories` and `/api/content/creator-summary` registered; actual consumer requests unknown |
| Identity | Authenticated candidate owner | Session-owned active creator + own exact valid grant |
| Origin | Resolver prefers API URL; legacy hostname fallback; installed value unverified | API host historically metadata-confirmed; Vercel effective origin/rewrites unknown |
| Schema | Eight-field owner archive, `display_status`, round metadata | Seven-field candidate list plus creator/ok; separate count; consumer expectation unknown |
| Filters | Four archive statuses, no grant required | Offered/shared and granted/non-revoked creator link |
| Relationship now | Explicit original FK, optional embeds | Explicit original FK/alias/inner join shared by list/count |
| Detail | No card navigation in component | Existing ideas/round reads authorized separately; actual navigation unknown |
| Published evidence | Historical route error and unauthenticated 401; user-reported later Android success | Historical list error/count reproduction; no signed-in published success/rendering proven |

### Findings supported by evidence

- Candidate listing is a different contract from generated-content listing and
  owner archive; treating the three as interchangeable is incorrect. [S2–S6]
- Historical History and Studio list ambiguity is directly recorded, not merely
  inferred from migrations. Exact-count HEAD ambiguity was independently diagnosed,
  with the historical summary-cause caveat above. [E3, E5]
- Current FK-qualified helper already remedies that source-level relationship
  ambiguity without changing schema/permissions or payloads. [S5, S8, E5]
- Missing original report and absent Vercel source preclude recovering original
  wording or claiming full frontend tracing. [E1, E5]

### Hypotheses and unresolved causes, not findings

Wrong/stale API release, wrong Vercel origin/rewrite, missing creator grant,
inactive/mismatched creator, parser/envelope mismatch, using ideas rather than
candidates, client-side filtering and error-to-empty conversion can each explain
remaining web symptoms. No available signed-in trace identifies which applies.
Earlier 404 reports alone do not prove missing routes; current registration is
verified and unauthenticated 401s cannot establish authenticated route availability.
Android success alone proves neither shared deployment/database nor web permission.

## 8. Remaining evidence requirements and minimal separate implementation

These are future evidence needs, **not new access requirements for this reconstruction**.
No credential collection, live probes or production mutations are authorized here.

1. Obtain the separate web screen/component/hook/service and relevant deployment
   origin/rewrite configuration; identify actual method/path/parameters, expected
   envelope, aliases, cache identity, filtering, badges, navigation and states.
2. In an existing authorized signed-in creator context, retain sanitized captures
   of list/summary and applicable detail: UTC time, effective origin/path, status,
   content type, field/type validation and safe release identifier. Never retain
   bearer tokens, cookies, credentials or unnecessary personal payloads.
3. Link the serving artifact to intended source/build using publishing evidence.
   A release digest alone identifies an artifact, not a commit; successful build
   metadata, health and local mocked tests are insufficient.
4. If fixture absent, compare owner/creator/candidate/permission identity and status
   read-only in the intended target. Record eligibility results rather than real
   IDs or raw account data. Empty success cannot prove a populated authorized join.
5. Verify signed-in web headline, badge and any detail access separately from API
   success, including count/list concurrency and permission changes.

**Smallest separately authorized work:** continue the existing web-consumer
verification scope, first establish target/release and actual consumer contract,
then adapt only mismatched parsing/fields/states/navigation demonstrated by evidence.
Use the existing endpoints; do not duplicate reads, change owner scope, grant
permissions, regenerate drafts or reapply the already-merged FK correction.
Any production publication requires separate approval and release verification;
do not claim Studio fixed before both signed-in responses and rendering are checked.
Mobile History and the inverse story-sharing requests ambiguity are separate
existing work, not implementation required to restore this document.

## 9. Focused regression matrix for separately authorized verification

**Not executed during reconstruction.** Source S8 contains mocked route regressions;
E3/E4/E5 record past local test results. Those are not live integration or browser
tests. Use existing read-only fixtures/sessions where possible, never mutate real
permissions or generate stories merely to execute this matrix.

| Case | Expected boundary/result | Evidence or required verification layer |
| --- | --- | --- |
| Known shared fixture, correct owner | Correct candidate headline and Shared, not generated draft title | E1/E2 expectation; owner API response + Android rendering needed for release-specific verification |
| Same fixture, creator with own valid grant | Candidate in Studio list; contributes one to count; raw shared maps to agreed Shared badge | S5/S7; signed-in API + actual web UI |
| Wrong owner | Other owner's candidate not returned; query user override ignored | S3; S8 History owner-filter assertions |
| Wrong creator/mixed grant rows | Excluded; pending own row cannot borrow other creator's grant | S8 “does not combine a pending own grant with another creator's active grant” |
| No/inactive creator; ambiguous active profiles | Studio 403; initial ambiguous lookup 500, not arbitrary creator selection | S8 ownership/ambiguity/helper-error cases |
| Missing/malformed/expired/throwing auth | Three exact 401 bodies as appropriate; no candidate access | S4/S8; signed-in/session-boundary capture |
| Pending/revoked/missing permissions | Owner badge per precedence; excluded Studio; detail 403 | S3/S5/S6, S8 permission cases |
| Permission precedence | Non-revoked beats revoked regardless of age; newest within group; Shared/Approved/Pending/Declined and candidate fallbacks | S3; S8 History “picks the active (non-revoked) permission row…” and badge cases |
| Candidate statuses | History four archive statuses; Studio offered/shared only; candidate excluded | S3/S5/S8; no inferred draft exclusion across tables |
| Null round/profile metadata | History null keys/card survives; null headline fallback; no invented Studio metadata | S1–S3; S8 missing metadata case |
| Empty versus DB/query/count failure | Exact empty envelopes; errors remain 500; null count not zero; UI never silently empty on errors | S8 “does not turn an unavailable count into a misleading zero”; actual UI states unverified |
| FK ambiguity on list and count | Both retain explicit original FK, alias/inner join and exact creator/grant/revoked filters | S8 “qualifies the intended FK for list/count while preserving every authorization filter”; E5 configured-target read evidence only |
| Large lists/pagination/ties | Studio all internal pages, created_at/id descending; independent exact count; concurrent changes allowed; History cap limitation understood | S8 “paginates the list and counts the same authorized set beyond one page” |
| List/detail consistency and revocation | Candidate can exist without generated ideas; generated draft not list title; access rechecked; missing/denied detail handled distinctly | S4/S6; actual Vercel navigation and applicable round/ideas read capture |
| Wrong origin/release/unknown path | Capture exact URL/status/content type/build evidence; no empty conversion; authenticated unknown HTML 404 versus unauthenticated 401 | S8 auth-before-matching case; E4 control; serving/consumer evidence still needed |
| Capability injection and side effects | Identity/capabilities DB-derived; no writes/AI/credits/usage from candidate reads | S5/S8 injection/capability tests; E6 read-only contract |

## 10. Scope confirmation

This reconstruction changes documentation only. No application code, tests,
migrations, configuration, ignore rules, environments, database records,
permissions, generation, builds, workflow restarts or deployments were changed.
No fresh production request, credential collection or signed-in browser test was
performed. The two copies are identical; the tracked copy preserves the report
across merges without changing `.local/` ignore behavior.
