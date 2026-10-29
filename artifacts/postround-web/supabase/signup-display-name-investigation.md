# Signup display-name correction — owner-applied, definition verified

## Evidence-supported root cause

The owner supplied the deployed trigger/function definitions from PostgreSQL.
The enabled `auth.users.on_auth_user_created` trigger runs
`public.handle_new_user()` AFTER INSERT. Before this correction, that function
initialized the name with:

```sql
coalesce(new.raw_user_meta_data->>'full_name', new.email)
```

The shared web signup handler sends `options.data.display_name`, not `full_name`.
The previous live initializer therefore ignored the supplied web name. The checked-in
historical migration 002 does not represent that deployed definition and must
not be replayed.

The other supplied profile triggers protect credit fields and set `updated_at`;
neither writes the name. The owner also supplied NULL defaults/no generation for
`profiles.id` and `profiles.display_name`. The example's email-valued name was
created by the separate app codebase; it is not a web defect to repair.

## Exact production change

The owner reported running `migrations/202610290001_signup_display_name.sql`
and supplied the resulting verification query output. The agent did not execute
production SQL. This migration replaces only `public.handle_new_user()` with the supplied deployed definition
except for this expression:

```sql
coalesce(
    nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
    new.raw_user_meta_data->>'full_name',
    new.email
)
```

This prefers a nonblank trimmed web name. Missing, null, empty or space-only
names use the existing full_name/email fallback. The full_name fallback is
intentionally not trimmed or normalized, preserving its previous behavior.

The function retains its trigger return type, PL/pgSQL language, SECURITY
DEFINER, `pg_catalog, public, pg_temp` search path, `new.id`, avatar mapping,
and `ON CONFLICT (id) DO NOTHING`. CREATE OR REPLACE retains the function's
identity, owner and grants; the existing trigger remains attached.

There are no account updates, backfills, table changes, trigger replacements,
client-side profile patches, role/credit/subscription/referral/favorite changes,
native code changes, or display-name editing changes. The statement updates the
function definition; it does not scan or rewrite existing profiles. Future inserts
that already have a profile continue to leave that row untouched.

No website deployment or production configuration change is required for this
mapping correction. Do not replay migration 002 or push the historical migration
chain indiscriminately.

## Final form-to-profile flow

1. Creator slug routing preserves its existing referral evidence/cookie behavior.
2. `src/app/(auth)/signup/page.tsx`, `handleSendCode`, sends the trimmed name in
   `auth.signUp({ ..., options: { data: { display_name } } })`.
3. Supabase stores that intermediate value in
   `auth.users.raw_user_meta_data.display_name`.
4. The existing Auth INSERT trigger is attached to the
   corrected initializer and inserts the name into `public.profiles.display_name`
   with `profiles.id = new.id` (the exact Auth UUID).
5. Confirmation and same-UUID credential verification remain unchanged.
6. The existing dashboard queries `profiles` by the authenticated UUID and
   prefers its persisted name. The disabled metadata-backed profile page is
   outside this change and remains untouched.

## Validation results

Executed with existing workspace tooling:

```sh
cd artifacts/postround-web
node --experimental-strip-types --test \
  src/lib/auth/signup.test.ts src/lib/auth/signup-profile-migration.test.ts
pnpm run typecheck
# From repository root:
git diff --check
```

- **7 tests passed:** 3 existing signup checks and 4 new source-contract checks.
  The new checks compare the entire migration to the owner-supplied deployed
  definition with only the intended expression replaced; assert fallback order,
  UUID/avatar/security/conflict preservation; and reject unrelated statements.
- **TypeScript passed.**
- **Diff whitespace check passed.**
- These are source/static checks, not live database persistence evidence.
- Before the owner's instruction forbidding new test environments arrived, a
  disposable local PostgreSQL check reproduced failure with the old definition
  and passed with the correction, including fallback, UUID/avatar, confirmation,
  replay and established-name cases. It was automatically removed. Its harness
  was removed from this change. This was not Supabase or production acceptance;
  no further local or remote environment will be created for this fix.
- No new test account, real signup email, browser signup acceptance, agent-run
  production SQL write, application deployment, or production configuration change occurred.
  Future signup checks in the existing environment await separate authorization.

## Approval and application status

**The owner reports the production migration is applied and has supplied the
database verification output.** The returned full function definition matches the
prepared correction, including:

- trimmed nonblank `display_name`, followed by unchanged `full_name`, then email;
- `new.id`, avatar metadata, and `ON CONFLICT (id) DO NOTHING`;
- `security_definer = true`;
- `function_settings = ["search_path=pg_catalog, public, pg_temp"]`;
- `function_owner = postgres`;
- enabled (`O`) `on_auth_user_created` AFTER INSERT trigger on `auth.users`,
  still executing `handle_new_user()`.

This is owner-supplied production catalog evidence, not a direct agent database
read or a real signup test. No additional function application is needed based
on this result. A fresh signup, UUID-matched profile row, confirmation/reload,
dashboard display and unchanged referral behavior have not yet been exercised
against the existing environment; the owner explicitly deferred those steps
until separately authorized.

The installed Supabase connection exposes PostgREST data access, not SQL
execution. Its catalog read was rejected with HTTP 406/PGRST106 because only
`public` and `graphql_public` are exposed. No Supabase CLI executable or linked
CLI configuration was found in the workspace. The owner performed application
and read-back with their existing SQL access. Do not install an
arbitrary SQL RPC or change the schema to gain that access.

The supplied function read-back does not establish whether this migration is
recorded in Supabase's private migration ledger. That remains unverified.
Do not replay the migration chain or mark unverified historical versions applied.
Any migration-ledger reconciliation requires a narrowly scoped, separately
authorized check through the established migration workflow.

## Changed files

- `migrations/202610290001_signup_display_name.sql`: function-only mapping fix.
- `../src/lib/auth/signup-profile-migration.test.ts`: four source-contract checks.
- `diagnostics/signup-display-name-readonly.sql`: initial read-only inspection.
- `diagnostics/verify-signup-display-name.sql`: full-definition/settings/trigger read-back.
- `signup-display-name-investigation.md`: evidence, results and remaining limitations.
- `README.md`: link to this report.

No signup handlers, dashboard/profile rendering, existing browser fixtures,
historical migrations or other functions/triggers were modified.

If a rollback is necessary, separately approve restoring only the previous
full_name/email expression in the same complete function definition. No account
backfill or data reset is part of either direction.
