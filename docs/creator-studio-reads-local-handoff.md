# Creator Studio reads — local implementation handoff

> Subsequent consumer work, approved optional relevance-score extension, and
> current source/release limitations are documented in
> [creator-studio-consumer-handoff.md](creator-studio-consumer-handoff.md).
> This original handoff's seven-field response describes its earlier scope.

## Source and integration

- Repository: `https://github.com/PostRoundCoach/postround-web.git`.
- Actual execution branch: `main` in the assigned task workspace.
- Base HEAD and HEAD at local verification: `e3eabd6a35e725d88eb88b750616a6224efbae12`.
- Intended integration targets: `main` and `preview-production-test`.
- Inspected `origin/preview-production-test`: `9f827cd93aa46ceccd45060071c89d66dc07934c`.
- The API source on these two inspected target references is identical.
- One implementation is supplied through task completion/integration, not two
  divergent handlers. No branch push, promotion or production release was made.
- No final integration commit exists at the time of this report; the supported
  task integration workflow supplies that identity. The inspected source hashes
  above are **not** serving deployment identities.

## Authoritative input and missing evidence

Both supplied attachments were reconciled against the existing API. Their
minimal envelopes and exact errors are authoritative, not the old handlers or
the existing frontend expectations.

The referenced `resolveCreatorOwnership`, `storyPermissionCheck`, release
handoff, and eight-file/224-test implementation baseline were not found in this
checkout or the two target trees. A narrow local history search did not recover
the referenced helpers. No historical 224-test result is claimed or rerun.

This implementation adapts those semantics to the existing connector REST
architecture: two-row ambiguity detection instead of Supabase JS `maybeSingle`,
an isolated ownership recheck, explicitly correlated PostgREST permission joins,
GET offset/limit pages of 100, and a HEAD exact count. These are internal
implementation choices, not response aliases or public pagination.

## Covered endpoints and behavior

- `GET /api/content/stories`: `{ok:true,creator,stories}`, seven documented
  narrative fields per candidate, no player, permission, score, generation or
  follower fields.
- `GET /api/content/creator-summary`: `{ok:true,creator,summary:{storyCount}}`,
  an independent exact nonnegative safe-integer count using the same eligibility
  and correlated permission predicates.
- Both derive identity from session verification and ignore request
  identity/capabilities/filter/pagination inputs.
- Ownership and active status are rechecked after initial creator lookup.
  Ambiguous active creators return endpoint-specific 500. Multiple active voice
  rows do not imply ambiguous creators.
- Capabilities are database-derived; creator voice requires advanced capability
  and the first active linked voice.
- Only offered/shared candidates with one same-row own granted/non-revoked
  permission are eligible; pending, revoked, missing and other-creator grants
  cannot admit candidates.
- List ordering is `created_at DESC,id DESC`; pages continue until short,
  including an empty final page at exact 100-row boundaries.
- Errors contain only `error`. The three exact 401s, ownership/helper-level 403,
  initial lookup/ambiguity/join/unexpected endpoint-specific 500s and missing
  count failure are covered.
- Authenticated unknown content GETs fall through to Express HTML 404.
  Unauthenticated unknown GETs receive authentication-required JSON 401.
- Diagnostics contain only the endpoint failure label, never raw upstream
  errors, response payloads or credentials.
- No follower queries, generation, writes, cleanup, or usage/credit consumption
  occur in these reads. Session verification retains both issuer validation and
  connected-project identity alignment.
- Existing ideas/round/action/account validation, auth and error contracts are
  retained. The strict read auth mode is opt-in, not a global auth rewrite.

## Changed files

| File | Purpose |
| --- | --- |
| `artifacts/api-server/src/lib/creator-studio-reads.ts` | Isolated creator resolution, minimal list, shared eligibility join, exact summary |
| `artifacts/api-server/src/lib/creator-content-data.ts` | Reuse REST/count utilities; read-only opt-in auth parsing/errors; remove obsolete wide/follower reads |
| `artifacts/api-server/src/routes/content.ts` | Single handlers, narrow read/unknown-GET authentication, safe exact error mapping, injection for offline tests |
| `artifacts/api-server/src/lib/creator-studio-reads.test.ts` | Offline contract, permissions, capabilities, pagination, auth, errors, fallthrough and neighboring-route coverage |
| `artifacts/api-server/src/lib/story-engine.test.ts` | Replace nine incompatible read tests, remove their unused imports; retain all unrelated tests |
| `artifacts/api-server/package.json` | Explicit offline suite as default and separate live-test opt-in |
| `docs/creator-studio-reads-local-handoff.md` | Source identities, verification evidence and integration limitations |
| `.agents/memory/creator-read-contract-boundary.md` and memory index | Preserve the intentional API/consumer boundary and verification rule |

The two input attachments are unchanged. No web-client, deployment configuration,
secret, migration or schema changes were made.

## Local verification

Commands executed from the repository root:

```sh
pnpm --filter @workspace/api-server run test:offline
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server build
git diff --check
```

- Offline suite: **129 passed, 0 failed, 0 skipped, 0 cancelled**, four files.
  This comprises 88 new contract regressions, 29 retained story-engine/neighbor
  tests, and 12 account-deletion/regression tests.
- Typecheck: passed.
- Build: passed; existing bundle-size warning is informational.
- Whitespace/diff check: passed.
- The local **development** API workflow was restarted once after the code batch;
  startup logs were clean and the local preview `/api/healthz` returned
  `{"status":"ok"}`. This health-only smoke check performed no session/data
  queries and is not authenticated Creator read verification. No production
  workflow was restarted.
- `story-engine.live.test.ts`: explicitly excluded, **not run**, not counted
  as skipped or passing. No connector-backed live verification or production
  fixture access occurred.
- Mocked Express tests use temporary loopback ports and injected auth/data
  dependencies. They establish local handler behavior, not live PostgREST,
  applied database schema, authentication configuration or serving identity.

## Preview readiness and remaining prerequisites

The API implementation is ready for a separately authorized controlled Preview
release/test after task integration. There are no known unresolved local contract
failures. No live authenticated endpoint success is claimed; a middleware 401
would not prove either handler was available.

Before end-to-end verification:

1. Integrate this same implementation into both intended source targets through
   the supported workflow; identify the actual Preview serving commit/config.
2. Confirm the Preview API's connected Supabase project and session issuer are
   aligned, with configured verification access and a genuine active creator
   user session from that project. Anon/service-role keys are not user sessions.
3. Confirm applied schema, linked voice relationship, joined permission filters,
   exact count headers and pagination behavior in Preview. Mocks do not prove
   these database behaviors.
4. Use only expressly authorized fixtures. Verify authenticated successes,
   empty results and failure cases on the actual Preview release.
5. Adapt/verify the separate frontend consumer in its own scoped work.

**Known web incompatibility:** the current web client requires
`permission_status`, `significance_score`, `follower_count` and
`available_story_count`. The canonical reads intentionally omit these and expose
`summary.storyCount` instead. This report does not claim the current web works
with the new contract. Do not add aliases or extra fields to hide that mismatch.

List pages, creator lookups and separate list/count requests are not an atomic
snapshot. Concurrent permissions/candidate changes may change request agreement
or shift offset-page rows, as allowed by the supplied contract.

No production deployment, production restart, promotion, direct target push,
environment change, schema change or data write is authorized by this handoff.
