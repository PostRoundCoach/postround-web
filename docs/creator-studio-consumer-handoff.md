# Creator Studio consumer alignment

## Scope and evidence

This work adapts the checked-in Post Round Coach web consumer to the reconstructed
Creator Stories contract supplied on 2026-10-13. Verification below is local source
and synthetic authenticated-fixture evidence, not signed-in production evidence.

After tracing the source, the user explicitly approved a small API extension:
select and project the existing candidate `significance_score`. No migration,
new endpoint, generation, credit use, direct-client candidate read, permission
change, deployment, origin change, secret change, or branch promotion is included.

## Read contract and behavior

- `GET /api/content/stories` requires HTTP 200 JSON, `ok: true`, a validated
  `creator` descriptor (UUID profile id, name, two boolean capabilities), and a
  `stories` array. Each candidate requires UUID `id` and `round_id`, string
  `story_type`, `headline`, `summary`, raw `offered/shared` status, and a valid
  timestamp `created_at`. Type is open, not a closed story-type enumeration.
- A seven-field candidate remains valid. The approved optional extension is
  `significance_score`, validated as an integer from 0–100 when present.
  Missing scores do not fabricate zero or invalidate a candidate.
- The source query reads `story_candidates`. Its checked-in migration already
  defines the score column. Only the select/projection was extended; the same
  creator/granted/non-revoked authorization predicates, order and pagination remain.
- Cards use candidate headline and summary regardless of whether round details
  or generated ideas can load. Shared/Offered badges are raw candidate status,
  not Pending/Approved/Declined and not export consent.
- Initial visibility is all returned candidates in server order. Date filtering
  is opt-in using the supplied `created_at`; relevance has no default threshold.
  The relevance checkbox is off by default; the retained 60–90 slider applies
  its selected minimum only when the checkbox is enabled. Unscored candidates
  remain valid and visible by default but cannot satisfy an enabled threshold.
  Missing-score handling is defensive only, with no extra counts or messaging.
- Date/relevance filtered-empty is separate from a validated empty response.
  Missing envelopes, malformed JSON, HTML/routing failures, transport failures,
  and server errors cannot produce a successful empty queue.
- The summary consumes only `summary.storyCount`, an exact nonnegative safe
  integer, including zero. Follower counts are omitted. Summary and list reads
  are independent/non-atomic; neither replaces the other or list length.
  Count failures are visible, with retry and sign-in recovery.
- Current Supabase session bearers go to the existing configured API. The API's
  creator id/capabilities are authoritative for reads; profile lookups retained
  for server navigation guards/social presentation do not select API identity.
- Session identity changes clear creator list/detail state and abort/discard
  prior in-flight reads. Dashboard count presentation is also session-bound.
  API errors never echo raw upstream bodies.

## Detail and actions

Round details load on demand through the existing separately authenticated
`GET /api/content/round/:round_id` and its existing server permission recheck.
The returned detail candidate must match the card, the grant state must be valid,
and revocation must be null before sensitive detail content is presented.

Approval begins as unknown until authenticated details load, not inferred from
the minimal list. Per the user's established product behavior, Share with Creator
is player approval. The detail contract's granted permission state (the server's
existing `permission_granted=true` check), non-null `granted_at` and null
`revoked_at` mean approved even when `approval_requested_at` is null.
No second approval is requested or required. Existing export gates, approval
action responses and dismissal endpoints remain unchanged.

The narrow product-scope correction removed the additional request-timestamp
requirement and the proposed extra post-action detail request. Pending/requested
stories without a grant retain their existing behavior. Regression assertions
recognize a pre-approved sharing grant, omit Request approval, enable the existing
scorecard export and issue no approval POST. No permission model, schema,
relationship, mobile flow or API action behavior was changed.

A detail 403/401 clears sensitive detail and disables detail actions without
removing the card. A 500 offers retry. An authorized null generated content idea
has a distinct no-ideas state while retaining candidate and authorized round data.

## Effective origins and source/release gaps

- Checked-in production configuration declares
  `NEXT_PUBLIC_POSTROUND_API_BASE_URL=https://api.postroundcoach.com`.
  That is configuration evidence, not proof of the effective Vercel build.
- The development environment has no configured value for that key. Its
  consumer therefore fails explicitly rather than falling back to same-site
  `/api`, which is claimed by the separate API artifact. No value was changed.
- Isolated browser/build fixtures explicitly use `http://127.0.0.1:54321`,
  test-only local-origin opt-in, and `.next-e2e`, separate from managed-preview
  build outputs. All accounts/payloads in those tests are synthetic.
- This checkout uses `creator-studio-reads.ts`, not the attachment's differently
  named `creatorStudioReads.ts`. Its candidate query still uses unqualified
  `story_permissions!inner(story_id)`. The attachment's separately described
  explicit-FK correction is not present here. It was not reimplemented.
  The local fixture does not simulate PostgREST relationship ambiguity.
- Neither merged-task history, this score projection, local build success, nor
  mocked authorization proves which source release serves production.
  No production fixture grant was created and no real player row was queried.
  The user-supplied row establishes supplied evidence, not fresh live verification.

## Separate release prerequisites

Before any release action, obtain separate approval and reconcile the intended
API source with the already-described explicit permission-FK correction for both
list and exact count. Confirm the effective Vercel/API origins and source/build
identity. In an already-authorized signed-in creator context, verify sanitized
list/count/detail responses and the rendered candidate headline and Shared badge,
independent of the generated draft title. Owner History access is not proof of
creator authorization. Preserve timestamped status/content-type/schema and safe
release evidence, never credentials or raw player responses.

## Verification

- Web typecheck: `pnpm --filter @workspace/postround-web typecheck` — passed.
- API typecheck: `pnpm --filter @workspace/api-server typecheck` — passed.
- Focused web unit tests:
  `cd artifacts/postround-web && node --experimental-strip-types --test src/lib/creator-stories/*.test.ts src/components/dashboard/*.test.ts src/components/creator/*.test.ts`
  — **45 passed**, including exact counts, optional scores, opt-in date/relevance,
  and pre-approved sharing with a null request timestamp.
- API offline suite: `pnpm --filter @workspace/api-server test:offline`
  — **131 passed**. The score omission/invalid-value and pre-approved-sharing
  tests join the existing
  authorization, capability, pagination, exact-count and failure coverage.
- API build passed during the managed API workflow restart.
- Isolated Next production builds passed through the fixture runner, including
  the final checkbox/slider change, without using managed-preview output.
- Initial browser command:
  `sh artifacts/postround-web/e2e/run-tests.sh creator-canonical-reads.spec.ts creator-story-workflow.spec.ts creator-navigation.spec.ts`
  — **29 passed, 1 failed** because the existing ordinary-player navigation test
  still expected the removed Subscription label. It now expects Player Profile
  without changing the player dashboard or ownership guards.
- Focused corrected-navigation and access-race rerun:
  `sh artifacts/postround-web/e2e/run-tests.sh creator-canonical-reads.spec.ts creator-navigation.spec.ts --grep 'ordinary players|revoked approval action|sign-out clears a delayed round-detail'`
  — **3 passed**. This includes denying an approval mutation after detail load
  and discarding detail responses after sign-out.
- Final user-specified filter rerun:
  `sh artifacts/postround-web/e2e/run-tests.sh creator-canonical-reads.spec.ts creator-story-workflow.spec.ts --grep 'relevance checkbox|optional date filter'`
  — **2 passed**, proving checkbox off, selected score filtering, basic missing
  score handling, reset-to-all behavior, API creation dates and refresh.
- Narrow pre-approved-story correction:
  `sh artifacts/postround-web/e2e/run-tests.sh creator-canonical-reads.spec.ts creator-story-workflow.spec.ts --grep 'detail 200 preserves|approved story downloads|queue persists candidates'`
  — **3 passed** after the product clarification, verifying approval with a
  null request timestamp and no second approval POST, existing downloads,
  and unchanged pending/requested/dismissal persistence. The isolated Next
  production build also passed for this final source.
- The broader `pnpm --filter @workspace/postround-web test` ran:
  **130 passed, 1 failed**, an unchanged referral test outside this scope.
  `src/lib/referrals/referrals.test.ts` expects the favorite-referral function in
  `supabase/migrations/202610070001_web_referral_favorite.sql`; that tracked file
  is two whitespace bytes both before and after this task. No migration was
  restored, changed or applied. This is a pre-existing repository test blocker,
  not a Creator contract failure, and the full suite is not reported as passing.
- Managed web/API workflows restarted cleanly. An unsigned `/login` screenshot
  confirmed the preview renders; signed-in Creator evidence comes from the
  isolated synthetic browser assertions, not that screenshot.
- `git diff --check` passed. Fixture wrappers restored Next-generated
  `next-env.d.ts` and `tsconfig.json`; isolated outputs are ignored by Git.

The initial browser launch was blocked by a missing matching Chromium executable;
installing the matching test browser resolved that runner dependency without
changing app configuration. No configured validation has been silently waived.
