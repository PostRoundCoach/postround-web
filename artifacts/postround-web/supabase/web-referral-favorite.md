# Web referral favorite: amendment, evidence and acceptance

## Scope and eight-part implementation report

1. **Attribution creation/finalization.** `public.claim_creator_referral(uuid, text)`
   creates the unique, immutable `creator_attributions` record. `/r/{slug}` only
   issues click evidence through `issue_creator_referral`. The verified password
   signup path reaches `/signup/complete`; its client POSTs `/referrals/claim`.
   Password login and the PKCE callback also call the same pending-claim helper.
2. **Propagation location.** `migrations/202610070001_web_referral_favorite.sql`
   replaces only the existing claim function. The same transaction updates the
   profile on web-method established-claim retries and after fresh insertion /
   insert-conflict resolution. Failure of the profile UPDATE aborts the fresh
   attribution too; no application-side profile write can silently diverge.
   `src/lib/referrals/claim.ts` replaces the early existing-attribution success
   with an RPC replay using its own-user RLS-read original event ID. Confirmation
   now processes a pending cookie even when original attribution already exists.
3. **Exact non-overwrite logic.**

   ```sql
   UPDATE public.profiles p SET favorite_creator_id = a.creator_id
     FROM public.creator_attributions a
     WHERE p.id = claimant AND a.user_id = claimant
       AND p.favorite_creator_id IS NULL;
   ```

   `claimant := auth.uid()`, not a caller parameter. This is a conditional UPDATE,
   not a read-then-write. Both paths run only for `claim_method = 'web_referral'`.
   The post-insert path additionally requires no other user's attribution using
   the submitted evidence (`NOT EXISTS ... used.referral_event_id = evidence_id
   AND used.user_id <> claimant`). This prevents consumed-other-user evidence
   from authorizing a favorite write while preserving the legacy RPC return.
   The Creator always comes from the persisted original attribution, not from
   a cookie, slug, event's requested Creator, or browser hint.
4. **Idempotence.** Existing user/event uniqueness and `ON CONFLICT DO NOTHING`
   remain. A populated favorite matches zero UPDATE rows, including a conflicting
   favorite, so repeated completion does not unnecessarily update the profile.
   A concurrent intentional non-NULL selection committed before the referral
   UPDATE wins: PostgreSQL waits on the row and rechecks the null predicate.
   Concurrent valid referral claims select the winning persisted attribution.
   Expiry, active-creator checks, established-claim expiry/deactivation exception,
   method/source, signature, return shape, grants, empty search path and native
   method behavior remain. Invalid evidence never reaches a profile UPDATE;
   no-attribution visits without pending evidence never call the RPC.
5. **Tests added/updated.**
   - `src/lib/referrals/claim.test.ts`: executes the actual handler body with
     mocked Next/Supabase dependencies; fresh claim, original-event replay after
     later/malformed cookie, transient error retention, no-pending no-op,
     malformed/terminal/consumed rejection, and attribution read failure.
   - `referrals.test.ts` and `confirmation.test.ts`: source-contract assertions
     for function-only scope, both null/identity guards, native-method isolation,
     consumed-evidence gate, security context and pending established completion.
   - `supabase/tests/web-referral-favorite.sql`: rollback-contained database
     assertions for A–D, original creator on later-click insert conflict,
     conflicting favorite/no unnecessary writes, expired established replay,
     unknown/expired/consumed evidence, unchanged native behavior, auth denial,
     and injected profile-write failure followed by a successful retry.
     Run together with the original `creator-referrals.sql` security suite.
   - `e2e/signup-confirmation.spec.ts` / `fake-supabase.mjs`: Creator slug through
     password signup, email verification, same-user password sign-in, claim and
     mock profile state; established replay, transaction-error UI/cookie recovery,
     conflicting favorite, ordinary signup/no favorite, reload/no extra writes.
6. **Results.** See the final results section below. Unit tests and the fake
   Supabase browser fixture are not execution of the SQL, RLS or concurrency
   guarantees. The SQL suites and real signup are release gates until run on an
   explicitly approved non-production clone.
7. **Mobile contract.** No mobile code changed. Read-only inspection of
   `PostRoundCoach/postroundcoach` main on 2026-10-07 found:
   - `artifacts/golf-coach/context/ProfileContext.tsx` selects `profiles.*` filtered
     by authenticated user ID, so the stored field is part of native profile reads.
   - `artifacts/golf-coach/app/(tabs)/profile.tsx` keys its Creator-name query on
     `profile.favorite_creator_id`, finds that ID in active Creators and renders
     the favorite through the existing profile UI.
   - `artifacts/golf-coach/lib/creatorService.ts` selects active Creator identities.
   - `artifacts/golf-coach/lib/supabase.ts` declares the native Profile's
     `favorite_creator_id: string | null` contract.
   - `artifacts/golf-coach/context/AuthContext.tsx` handles signed-in/initial-session
     state and invalidates cached user queries.
   This proves available source consumption, not the distributed binary version,
   fresh native authentication, or on-device favorite display. An inactive Creator
   may legitimately lack an active-Creator name despite a persisted favorite.
8. **Limitations/release.** No production migration, deployment, backfill, smoke
   account repair or other production write is authorized or performed. No
   explicitly approved non-production clone was supplied. Real email, database
   atomicity/security, cross-session races and fresh native display remain
   unverified. Do not present mock success or `golf-coach://` navigation as proof.

## Migration prerequisites and review

This migration is needed to extend the existing database function transaction;
**there is no profile/table schema change**. Do not edit/replay historical files.
Reconcile the dated production baseline with the clone, including existing
`profiles.favorite_creator_id` FK, `creator_profiles`, public slugs, the referral
tables/unique constraints/immutability and the existing function signature,
ownership, authenticated-only EXECUTE grants and `SECURITY DEFINER` context.
Do not assume the incomplete historical chain can rebuild an empty DB.

Review the function diff against `202609250001_creator_referrals.sql` and the
clone's current `pg_get_functiondef`; unexpected live drift blocks application.
Check both success branches and the consumed-other-user write gate. This
replacement retains existing ownership/grants; compare ACLs before and after.
There are no backfills, table DDL, deletion or subscription changes. Updates lock
only qualifying claimant profile rows; unique constraints still serialize claims.

## Approved staging acceptance checklist

An operator must first explicitly approve the **non-production** project/clone
and any test-account creation. Merely having a Supabase connection is not that
approval. Never use the production smoke-test account.

1. Verify target identity, baseline prerequisites, function drift and ledger with
   `supabase migration list` and `supabase db push --dry-run`. Review exactly the
   pending migration set; do not let the CLI apply unreconciled legacy files.
2. Apply the reviewed amendment through the authorized migration workflow to the
   approved clone. Run from `artifacts/postround-web`:

   ```sh
   psql -v ON_ERROR_STOP=1 -f supabase/tests/creator-referrals.sql
   psql -v ON_ERROR_STOP=1 -f supabase/tests/web-referral-favorite.sql
   ```

   Connect through the operator's approved clone configuration. Each file ends
   in ROLLBACK; do not remove it. Any assertion failure blocks release.
3. With clone-only staging fixtures and two independent connections:
   - For one player and two valid Creator events, BEGIN both authenticated claims
     concurrently; commit the first, then the second. Verify one original row,
     its method/source/event unchanged and a favorite equal to that original.
   - With a NULL favorite and established original claim, connection A begins a
     profile UPDATE choosing Creator B and holds the row lock. Connection B
     starts the original web claim and must block. Commit A; B must complete with
     favorite B unchanged. A second B retry must write zero rows.
   - Repeat fresh claim against a pre-existing conflicting favorite; both initial
     completion and retries must leave it unchanged. Verify no cross-user writes.
   - Two users claiming one event must yield one attribution; the losing user
     receives an empty result and retains a NULL favorite. If the loser already
     has a different original attribution and NULL favorite, the consumed event
     must not authorize a favorite write or alter that original.
   Clean up only operator-approved clone fixtures, not historical records.
4. Use a fresh real-email player: active Creator slug -> password signup -> signup
   OTP -> verified matching Auth identity -> successful same-account password
   login -> completion claim. Read DB/profile as that user: exactly one original
   attribution, `web_referral` / `creator_referral`, matching NULL-defaulted
   favorite. Revisit with pending original/later evidence; no replacement or
   duplicate. Test invalid/expired and ordinary signup: NULL stays NULL.
5. Inject a clone-only profile write error; prove neither fresh attribution nor
   favorite persists, the web cookie stays retryable, and removal of the error
   permits one successful atomic claim. Test an established-row retry error too.
6. Someone with the actual native app must sign out, then authenticate the **same
   new player** using the verified signup password, confirm native profile reads
   the populated ID and favorite name/display is available. Verify Creator B
   remains displayed for the intentional-favorite case. Record app build/version
   and target project without credentials. Browser deep links are not acceptance.

## Release and rollback/recovery

This task only prepares the migration and code. After staging acceptance, review
and separate explicit production/release authorization, an authorized operator
can apply only the reviewed pending migration using the repository's README
workflow, verify the ledger/function/ACLs, then release the web code. Migration
first avoids deploying a web replay path against an RPC that still skips favorites.
No manual production migration or deployment is performed here.

Recovery requires a **new reviewed function-only migration** restoring the exact
pre-amendment function definition captured before application (the repository's
referral definition is a reference, not proof of live state). Preserve signature,
owner and grants. A web rollback can accompany it through the normal release
workflow. Do not delete attribution or clear favorites: already-defaulted
favorites may subsequently have been chosen intentionally and must not be
retroactively rewritten. Fresh RPC errors roll back their whole transaction and
retain pending web evidence for retry; historical accounts without pending
completion evidence are intentionally not remediated by this change.

## Final validation results

- Focused referral/auth Node tests: **14 passed**.
- Full web package Node tests: **130 passed**.
- `pnpm run typecheck` at workspace root: **passed**, including web/API/shared
  packages and the existing preview sandbox.
- Isolated `signup-confirmation.spec.ts` + `password-signup.spec.ts`: **25 passed,
  0 failed**. Matching Chromium was installed after the initial runner launch
  found its browser executable missing. The runner restored Next-generated
  configuration; screenshots cover desktop/mobile confirmation. This proves
  mocked web orchestration/profile state, not database or native acceptance.
- Rollback-contained SQL suites, real-email staging signup, cross-session races
  and fresh native same-account profile/display: **not run** (approved clone/app
  access required); all remain mandatory release acceptance.
