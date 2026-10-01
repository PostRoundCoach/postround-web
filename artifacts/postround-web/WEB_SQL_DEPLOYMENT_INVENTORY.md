# Web SQL Deployment Inventory

**Scope:** source-only inventory of the SQL files in this repository relevant to
the Post Round Coach web/API deployment. This is not a migration-status report
or authorization to execute SQL. The repository contains nine Supabase migration
files and one non-production SQL test. See the
[production web deployment guide](./PRODUCTION_WEB_DEPLOYMENT.md) for the
deployment context, [environment checklist](./PRODUCTION_ENV_CHECKLIST.md) and
[placeholder template](./PRODUCTION_ENV_TEMPLATE) for configuration placement.

## Deployment status and limits

The Supabase README identifies checked-in migration files as desired history,
the private `supabase_migrations.schema_migrations` table as production history,
and the dated baseline as an observational starting point—not executable DDL.
It explicitly says the legacy files' presence does not prove matching production
ledger entries, and warns not to replay them blindly
([Supabase README, lines 8–20 and 63–77](./supabase/README.md#L8-L20)).

The baseline's production observations were read through PostgREST. They do not
establish complete DDL, constraints, indexes, triggers, grants, policies, or
the private migration ledger
([baseline, lines 5–14](./supabase/baseline/production-2026-09-17.md#L5-L14)).
Accordingly:

- **No migration is identified here as pending, applied, or safe to replay.**
  Production ledger state and exact live schema must be reconciled by an
  authorized operator using the reviewed workflow before any deployment.
- Existing tables, similarly named policies/functions, and the schema in any
  separate database repository must be compared with these files before
  adoption. Do not use filename order alone as proof that a file is safe to run.
- There is no checked-in migration that defines the baseline-only core tables
  `rounds`, `holes`, `content_ideas`, or `vad_telemetry_events`. Their presence
  in the dated inventory is not their complete DDL
  ([baseline, lines 24–42](./supabase/baseline/production-2026-09-17.md#L24-L42)).
- This chain cannot reconstruct a fresh database from an empty project. Several
  migrations depend on existing/evolved `profiles`, `rounds`, and other
  relations. The account-cleanup RPC explicitly checks for multiple of these
  relations and fails if its schema contract is incomplete
  ([059, lines 20–33](./supabase/migrations/059_account_deletion.sql#L20-L33)).

## Repository SQL files

“Production Required” means required only for the named feature when the
reviewed schema/ledger comparison confirms its behavior is absent. It does **not**
mean the migration is known to be pending. Apply nothing based solely on this
table.

| SQL File | Purpose | Production Required | Execution Order | Notes |
| --- | --- | --- | --- | --- |
| [`supabase/migrations/001_waitlist.sql`](./supabase/migrations/001_waitlist.sql#L1-L25) | Creates `public.waitlist` with unique email and RLS policies for public insert and authenticated reads. | Conditional: required for the web waitlist only if its table and access rules are absent after reconciliation. | Legacy base; compare the existing table and policy names first. | Legacy SQL predating the documented migration workflow. The web POST route inserts into this table ([waitlist route, lines 27–46](./src/app/api/waitlist/route.ts#L27-L46)). The file has no seed rows. Do not confuse its dashboard-SQL comment with approval to use an ad hoc production SQL-editor workflow. |
| [`supabase/migrations/002_profiles.sql`](./supabase/migrations/002_profiles.sql#L1-L67) | Defines an initial Auth-linked `profiles` table, self-read/update RLS, sign-up profile-creation trigger/function, and `updated_at` trigger/function. | Conditional: profile/Auth infrastructure is required by the application, but apply this historical definition only if reconciliation establishes that its objects and behavior are missing and compatible. | Before 003 and profile-dependent migrations; compare the live, evolved `profiles` table and trigger definitions. | This is an initial definition, not the complete schema read by the current app. It does not define many profile fields recorded in the baseline. Its `CREATE TABLE IF NOT EXISTS` does not reconcile an existing table's shape. |
| [`supabase/migrations/003_admin_user_management.sql`](./supabase/migrations/003_admin_user_management.sql#L1-L54) | Adds the profile role constraint, `admin_audit_log`, its read policy, and a trigger that guards role updates. | Conditional: required if the deployed admin role-management and audit path is enabled and these objects/guards are absent. | After compatible `profiles` exists; then reconcile with the role-management API. | Contains the file's explicit data backfill, setting null roles to `user` (lines 10–12). Review the update and trigger/policy names against live objects. The admin API updates `profiles` and writes `admin_audit_log` ([role route, lines 78–128](./src/app/api/admin/users/%5Bid%5D/role/route.ts#L78-L128)). |
| [`supabase/migrations/056_creator_identity.sql`](./supabase/migrations/056_creator_identity.sql#L1-L100) | Creates creator profiles/social accounts, adds `profiles.favorite_creator_id`, and configures creator/profile RLS. | Conditional: required for creator identity, favorite-creator, and creator-story functionality when absent and compatible. | After the actual `profiles` schema and its prerequisites are reconciled; before 057, the public-slug migration, and referrals. | Recovered legacy migration; presence does not confirm its ledger entry. It replaces the profile update policy and references evolved role/subscription fields (lines 86–100), so compare that policy and all required columns before considering application. No creator seed/backfill is included. |
| [`supabase/migrations/057_story_candidates.sql`](./supabase/migrations/057_story_candidates.sql#L1-L82) | Creates `story_candidates`, `story_permissions`, permission indexes, and RLS/policies for player and creator access. | Conditional: required for the supported story/permission APIs when absent and compatible. | After `creator_profiles` and the pre-existing `rounds`/Auth schema. Within the file, `story_permissions` is created before the `story_candidates` policy that references it. | Recovered legacy migration that depends on core schema not created here. It restricts authenticated updates to candidate status and limits active granted access with a partial unique index. Existing web/API story reads use both tables ([API data access](../api-server/src/lib/creator-content-data.ts#L212-L230), [story retrieval and permission queries](../api-server/src/lib/creator-content-data.ts#L319-L355)). |
| [`supabase/migrations/058_creator_story_approval_requests.sql`](./supabase/migrations/058_creator_story_approval_requests.sql#L1-L3) | Adds nullable `story_permissions.approval_requested_at`. | Conditional: required for code paths selecting this field if absent. | After 057 has created `story_permissions`. | No backfill is provided; existing rows remain null unless separately reviewed. This file is the explicitly renumbered follow-on, not proof that the old approval-column SQL was applied. |
| [`supabase/migrations/059_account_deletion.sql`](./supabase/migrations/059_account_deletion.sql#L1-L94) | Defines `delete_own_account_data(uuid)`, transactional application-data cleanup, and service-role-only execute grant. | Conditional: required for API account deletion if the RPC is absent or differs from the reviewed contract. | Only after every referenced relation and column has been reconciled. Apply before the later referral migration if following the checked-in history; the referral migration replaces this function. | **The file declares the same cleanup function twice** (first copy lines 4–94, second lines 97–187), including repeated grants. Treat this as one migration/file, flag the duplication for review, and do not split it into separate deployments. It deletes owned data, retains waitlist and audit history, and restricts execution to `service_role`. The API calls this RPC before deleting the Auth identity ([API account-deletion flow, lines 88–104](../api-server/src/lib/account-deletion.ts#L88-L104)). |
| [`supabase/migrations/202609190001_public_creator_slugs.sql`](./supabase/migrations/202609190001_public_creator_slugs.sql#L1-L57) | Adds/validates unique public creator slugs and defines/grants `get_public_creator_by_slug(text)`. | Conditional: required for public creator-by-slug routes if absent and compatible. | After 056 has established creator profile/social-account schema; before 202609250001. | Adds a check constraint, partial unique index, security-definer SQL function, and explicit execute grants. It contains no bulk slug-generation/backfill; confirm how existing creator records should be handled before application. The web reads the RPC by slug ([public creator server, lines 18–28](./src/lib/public-creators/server.ts#L18-L28)). |
| [`supabase/migrations/202609250001_creator_referrals.sql`](./supabase/migrations/202609250001_creator_referrals.sql#L1-L197) | Adds referral links, click events, and immutable original attributions; RLS, grants, triggers, and issue/claim RPCs; replaces account cleanup for referral foreign keys. | Conditional: required for creator-referral issuance/claiming and referral reporting if absent and compatible. | After 056 and `202609190001`; after the required profiles/core schema and, when present in the history, 059. Its replacement cleanup function is the final definition in the checked-in sequence. | No bulk referral or creator-link backfill: links are lazily created by `issue_creator_referral`. RLS denies client table writes while allowing a user's own attribution read; inspect the trigger/RLS/grant contract and all restrictive FKs. The final cleanup amendment deletes a referred player's attribution and anonymizes/detaches a creator identity with historical links before deleting profiles (lines 140–197). Web consumers call claim/issue and query referral tables ([claim client, lines 15–28](./src/lib/referrals/claim.ts#L15-L28), [referral read model, lines 32–47](./src/lib/creator-attribution/read-model.ts#L32-L47)). |
| [`supabase/tests/creator-referrals.sql`](./supabase/tests/creator-referrals.sql#L1-L109) | Clone-only SQL test of referral issuance/claiming, role access, expiry, immutability, and rollback. | **No. Never production SQL.** | No production execution order. Run only as documented against a reviewed, migrated, non-production clone. | The header requires a non-production clone and says writes roll back; the test ends with `ROLLBACK` (lines 1–4, 106–109). It creates transient test data and is not a seed file or migration. Do not copy fixture identities/data into deployment records. |

### Dependency-oriented order (conditional, not an apply list)

If an authorized reviewer decides a change is needed, the source-defined
dependencies imply this broad sequence, subject to the actual production ledger
and live schema:

1. Reconcile legacy 001–003 with their existing tables, policies, functions, and
   triggers; ensure an adequate, evolved `profiles` schema exists.
2. Reconcile/apply 056 only after the required profile columns and policy
   contract are verified.
3. Ensure the baseline-only `rounds` schema and Auth prerequisites exist before
   considering 057; then 058 follows 057.
4. Consider 059 only when every relation/column used by its cleanup contract is
   verified. Its duplicated function declaration is a review item.
5. Apply/reconcile `202609190001` after creator identity, then
   `202609250001` after slug/referral prerequisites. The latter replaces
   `delete_own_account_data`; verify that final function body/grant is present.
6. Keep `creator-referrals.sql` outside production. Its own header documents the
   clone-only, rollback behavior.

This ordering is a dependency summary, **not** a recommendation to replay any
file or a statement about what is pending. The README's canonical workflow calls
for ledger comparison, a clone of the dated baseline, dry-run review, and
post-application ledger verification; legacy repair is permitted only for a
confirmed version
([README, lines 35–57 and 72–77](./supabase/README.md#L35-L57)).

## Data changes, security, and recovery review

- The only explicit update/backfill among these migrations is 003's null-role
  update. Migration 058 adds a nullable field without backfilling it.
- Referral migration 202609250001 adds constraints and immutable-attribution
  behavior, but does not bulk-create referral links or backfill attributions.
  Its RPC lazily creates a creator's link on referral issuance. Do not invent
  or run a data backfill from the migration's existence.
- Review every RLS policy, grant/revoke, trigger replacement, `SECURITY DEFINER`
  function, and foreign-key action against the production contract. In
  particular, creator/story policies span 056/057/058, while 202609250001
  restricts referral table access and permits deletion of immutable attribution
  only inside the service-only account-erasure path.
- Account deletion is destructive and spans profiles, rounds, holes, content
  ideas, telemetry, creator/story data, and referrals. It intentionally keeps
  waitlist and `admin_audit_log` records in 059; the later referral-aware
  replacement changes treatment of referred players and creators. Review that
  replacement together with the API's two-stage order; never test it on
  production data.
- Do not blindly reverse migrations, drop data, or use an ad hoc SQL editor.
  Any repair, backfill, or rollback needs a separately reviewed plan and
  verified target schema.

## Historical SQL uploads (provenance only)

The following SQL-bearing historical uploads were inspected, but **none is an
additional repository migration or an extra production row above**:

- Two pasted `rounds` definitions contain older, partial table/RLS SQL
  ([upload A, lines 1–59](../../attached_assets/Pasted-create-table-if-not-exists-public-rounds-id-uuid-primar_1785266615169.txt#L1-L59);
  [upload B, lines 1–59](../../attached_assets/Pasted-create-table-if-not-exists-public-rounds-id-uuid-primar_1785266565754.txt#L1-L59)).
  They include an `input_method` definition not observed in the dated live
  baseline; the Supabase README explicitly leaves that discrepancy unresolved
  ([README, lines 79–85](./supabase/README.md#L79-L85)).
- The pasted `holes` definition is likewise older/partial and is not the missing
  authoritative current DDL
  ([upload, lines 1–65](../../attached_assets/Pasted-create-table-if-not-exists-public-holes-id-uuid-primary_1785266634647.txt#L1-L65)).
- Three copies of the historical 056 SQL and two copies of historical 057 SQL
  are present as uploads; copies within each group are byte-identical. The
  checked-in migration files, not these duplicate uploads, are the inventory
  rows ([056 upload, lines 1–18](../../attached_assets/Pasted--056-creator-identity-sq-1788548594098_1788548594099.txt#L1-L18);
  [057 upload, lines 1–19](../../attached_assets/Pasted--057-story-candidates-sq-1788548614658_1788548614658.txt#L1-L19)).
- A combined pasted artifact contains SQL corresponding to 002 profiles, 003
  admin management, and the approval timestamp alteration. It is provenance,
  not a fourth migration or a source of confirmed production history
  ([combined upload, lines 1–69, 72–125, 128–131](../../attached_assets/Pasted-002-profiles-sql-Profiles-table-linked-to-Supabase-Auth_1789478917636.txt#L1-L69)).
- A creator-story implementation request describes a proposed API/table
  workflow but is not executable migration SQL
  ([request, lines 43–107](../../attached_assets/Pasted-Implement-the-missing-creator-initiated-story-permissio_1789057800768.txt#L43-L107)).
  An avatar troubleshooting paste contains diagnostic SQL examples, not
  authoritative DDL or a migration
  ([troubleshooting upload, lines 21–62](../../attached_assets/Pasted-We-need-to-find-what-is-referencing-avatar-url-There-ar_1785259932372.txt#L21-L62)).

These older SQL uploads conflict with or omit parts of the observed schema and
must not be replayed or counted as independent deployables. The scoring audit
also cautions that historical attachments are only partial schema evidence
([audit, lines 20–27](../../docs/round-scoring-contract-audit.md#L20-L27)).

## Source-verified table and RPC consumers

These consumers establish current code expectations, not the full database
definition or migration history.

| Database object(s) | Current consumer(s) | Source evidence |
| --- | --- | --- |
| `waitlist` | Public web waitlist POST. | [Waitlist route, lines 27–46](./src/app/api/waitlist/route.ts#L27-L46) |
| `profiles` | Dashboard profile/round summary; role administration; subscription/profile reads. | [Dashboard, lines 66–78](./src/app/%28dashboard%29/dashboard/page.tsx#L66-L78); [admin role route, lines 78–128](./src/app/api/admin/users/%5Bid%5D/role/route.ts#L78-L128) |
| `admin_audit_log` | Admin role-change audit insert. | [Admin role route, lines 121–128](./src/app/api/admin/users/%5Bid%5D/role/route.ts#L121-L128) |
| `rounds`, `holes` | Player round list/detail and API story/creator scorecard reads. | [Round list, lines 49–63](./src/app/%28dashboard%29/dashboard/rounds/page.tsx#L49-L63); [round detail, lines 87–99](./src/app/%28dashboard%29/dashboard/rounds/%5Bid%5D/page.tsx#L87-L99); [API reads, lines 551–573 and 656–669](../api-server/src/lib/creator-content-data.ts#L551-L573) |
| `content_ideas` | Admin content read/update/delete/regeneration; API creator content and story paths. | [Admin content page, lines 25–54](./src/app/%28admin%29/admin/content/page.tsx#L25-L54); [admin content API, lines 23–49](./src/app/api/admin/content/%5Bid%5D/route.ts#L23-L49); [API data access, lines 569–573 and 697–701](../api-server/src/lib/creator-content-data.ts#L569-L573) |
| `creator_profiles`, `creator_social_accounts` | Public creator RPC, creator-story UI/API, and referral administration. | [Public creator RPC caller, lines 18–28](./src/lib/public-creators/server.ts#L18-L28); [API creator/story access, lines 212–230 and 319–355](../api-server/src/lib/creator-content-data.ts#L212-L230); [referral read model, lines 39–47](./src/lib/creator-attribution/read-model.ts#L39-L47) |
| `story_candidates`, `story_permissions` | API story retrieval, permission checks, and creator story/content paths. | [API queries, lines 212–230 and 329–355](../api-server/src/lib/creator-content-data.ts#L212-L230); [permissioned story/content reads, lines 533–573](../api-server/src/lib/creator-content-data.ts#L533-L573) |
| `creator_referral_links`, `creator_referral_events`, `creator_attributions`; `issue_creator_referral`, `claim_creator_referral` | Public referral issuance, authenticated claim, and server-side reporting. | [Claim RPC caller, lines 7–36](./src/lib/referrals/claim.ts#L7-L36); [referral reporting, lines 32–47 and 97–120](./src/lib/creator-attribution/read-model.ts#L32-L47); [referral migration RPCs, lines 72–138](./supabase/migrations/202609250001_creator_referrals.sql#L72-L138) |
| `get_public_creator_by_slug(text)` | Public creator profile lookup. | [RPC implementation/grant, lines 21–57](./supabase/migrations/202609190001_public_creator_slugs.sql#L21-L57); [caller, lines 18–28](./src/lib/public-creators/server.ts#L18-L28) |
| `delete_own_account_data(uuid)` | API cleanup RPC followed by Supabase Auth identity deletion. | [API sequence, lines 88–104](../api-server/src/lib/account-deletion.ts#L88-L104); [SQL grants and RPC, 059 lines 4–94](./supabase/migrations/059_account_deletion.sql#L4-L94); [referral-aware replacement, lines 143–197](./supabase/migrations/202609250001_creator_referrals.sql#L143-L197) |
| `vad_telemetry_events` | Admin VAD diagnostics reads. | [Diagnostics route, lines 101–159](./src/app/admin-data/vad-diagnostics/route.ts#L101-L159) |

## Separate database-mutating automation

The repository also has a database push path that is **not** one of the ten SQL
files and is not the documented Supabase migration workflow:

- [`scripts/post-merge.sh`](../../scripts/post-merge.sh#L1-L4) runs dependency
  installation and then `pnpm --filter db push`.
- [`lib/db/package.json`](../../lib/db/package.json#L10-L12) maps that command to
  `drizzle-kit push`; its `push-force` script offers a separate force variant.
- [`lib/db/drizzle.config.ts`](../../lib/db/drizzle.config.ts#L4-L13) targets
  PostgreSQL using `DATABASE_URL`. The currently checked-in Drizzle schema
  exports no table models ([schema index, lines 1–20](../../lib/db/src/schema/index.ts#L1-L20)).

Do not treat this post-merge Drizzle command as applying, validating, or
reconciling the Supabase migration files. Keep it outside the production
Supabase deployment procedure unless the owning database workflow and target
are separately verified. No SQL files, scripts, configuration, or application
code were changed as part of preparing this inventory.