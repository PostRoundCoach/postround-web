# Canonical Creator Studio read contract

**Reconciled and verified locally:** 2026-10-12 (UTC).
This is the canonical contract of the current implementation, not a claim that
the serving release or separate Vercel consumer has been verified. See the
[release handoff](creator-studio-release-verification.md) for timestamped evidence
and blockers. That handoff is evidence, not a second contract.

## Requests and success responses

Both routes are registered once in the existing content router, after its
unchanged `requireAuth` middleware. Supply:

```http
Authorization: Bearer <valid Supabase access token>
```

Use a real user access token from the serving API's configured Supabase project.
Service-role/anon keys are not user sessions. The implemented prefix is
case-sensitive (`Bearer `).
There are no required query parameters. Query/body identity and capability
values are ignored; neither endpoint offers caller-selected creator access,
filters or public pagination. A GET body is not required.
Both successes are HTTP 200 with `application/json; charset=utf-8`.

`GET /api/content/stories`:

```json
{
  "ok": true,
  "creator": {
    "id": "<creator_profiles.id>",
    "name": "<display_name>",
    "capabilities": { "advancedCreator": false, "creatorVoice": false }
  },
  "stories": [
    {
      "id": "<story_candidates.id>",
      "round_id": "<rounds.id>",
      "story_type": "multiple_birdies",
      "headline": "<headline>",
      "summary": "<summary>",
      "status": "shared",
      "created_at": "<database timestamp>"
    }
  ]
}
```

Stories are eligible **candidates**, not generated content or player-authored
`player_stories`. Only `offered` and `shared` candidates with an exact
creator-scoped `permission_granted=true`, `revoked_at IS NULL` permission are
returned. Pending, revoked, absent, and other-creator permissions cannot admit a
candidate. Results are ordered by `created_at DESC, id DESC`; internal 100-row
pages avoid silently returning only the default database row limit. This is
not a client pagination/filter API or a transaction snapshot across pages.
The list intentionally omits player identity, raw story_data, full rounds,
permission records, generated scripts, and advanced angles. Existing `/ideas`
and `/round/:round_id` remain the detailed content/round reads.

`GET /api/content/creator-summary`:

```json
{
  "ok": true,
  "creator": {
    "id": "<creator_profiles.id>",
    "name": "<display_name>",
    "capabilities": { "advancedCreator": false, "creatorVoice": false }
  },
  "summary": { "storyCount": 1 }
}
```

`storyCount` is the exact count of the same authorized eligible candidates,
not followers, all player rounds, content ideas, published posts, or AI usage.
The exact database count is independent of the list page limit. Separate
requests may differ if permissions/candidates change between requests.

### Fields and types

All documented fields are required and non-null under the repository schema.
No field aliases are provided. The examples' angle-bracket strings are
documentation placeholders, not literal response values.

| Field | JSON type | Definition |
| --- | --- | --- |
| `ok` | boolean, literal `true` | Successful read; absent from implemented error envelopes |
| `creator` | object | Session-owned active creator, containing only `id`, `name`, `capabilities` |
| `creator.id` | string (UUID) | `creator_profiles.id`, not the session user ID |
| `creator.name` | string | `creator_profiles.display_name` |
| `creator.capabilities` | object | Only the two database-derived booleans below |
| `creator.capabilities.advancedCreator` | boolean | Boolean value of `creator_profiles.advanced_creator` |
| `creator.capabilities.creatorVoice` | boolean | Advanced capability AND a selected active voice profile exists |
| `stories` | array of objects | Eligible authorized candidates; only on the stories endpoint |
| `stories[].id` | string (UUID) | `story_candidates.id`; not a generated content ID |
| `stories[].round_id` | string (UUID) | Candidate's associated `rounds.id` |
| `stories[].story_type` | string | Stored candidate type (e.g. `multiple_birdies`); no closed enum enforced by this read/schema |
| `stories[].headline` | string | Stored candidate headline |
| `stories[].summary` | string | Stored candidate narrative summary |
| `stories[].status` | string, `offered` or `shared` | Current eligible candidate status, not publication status |
| `stories[].created_at` | string (timestamp with timezone) | Database `timestamptz` serialization, passed through unchanged |
| `summary` | object | Only `storyCount`; only on the summary endpoint |
| `summary.storyCount` | number (nonnegative integer) | Exact database count of the same eligible authorized candidate set |

Each story contains **only** the seven fields in this table. No cursor, total,
next page, player, permission or generated-content object is returned.

### Exact empty successes

```json
{
  "ok": true,
  "creator": {
    "id": "<creator_profiles.id>",
    "name": "<display_name>",
    "capabilities": { "advancedCreator": false, "creatorVoice": false }
  },
  "stories": []
}
```

```json
{
  "ok": true,
  "creator": {
    "id": "<creator_profiles.id>",
    "name": "<display_name>",
    "capabilities": { "advancedCreator": false, "creatorVoice": false }
  },
  "summary": { "storyCount": 0 }
}
```

Empty data is not an authorization failure. Ineligible/unpermitted candidates
are excluded, not reported as per-story 403 errors.

## Identity, capabilities and read consistency

The active creator ID is selected by session user ID, then checked by
`resolveCreatorOwnership`. Multiple active profiles fail closed because the
initial lookup uses `maybeSingle`; this database error returns **500**, not 403.
No arbitrary active creator profile is chosen.

The helper rechecks ownership and active status and loads DB capabilities.
`creatorVoice` is true only if `advancedCreator` is true and the helper selects
an active linked voice profile. No active voice means false, including for an
advanced creator; an active voice on a standard creator still means false.
No follower threshold, request flag or entitlement/credit check is used.
The current helper selects the first `status = 'active'` voice in the returned
array (`find`); it does not reject multiple active **voice** rows. Do not confuse
that with ambiguous active **creator** profiles, which fail closed with 500.
Neither voice data nor social accounts are exposed in these envelopes.

Permissions must match the selected creator and candidate on the **same**
granted, non-revoked permission row. A pending own permission cannot combine
with another creator's grant to admit a candidate. The repository schema's
partial unique index allows at most one granted/non-revoked permission per story.
The API uses service-role SELECTs with explicit eligibility/permission filters;
it does not rely solely on creator RLS.

The list fetches successive internal ranges of 100 rows until a short page,
ordered by `created_at DESC`, then `id DESC`. The summary performs a head-only
exact count using the same joined eligibility filters. Internal pagination is
not a public interface. Neither multiple list pages, creator lookups nor two
separate endpoint requests form an atomic snapshot: concurrent data/permission
changes can change count/list agreement, or shift rows between offset pages.

These handlers perform SELECT/count queries only: no AI generation, writes,
sentinel cleanup, usage tracking or credit consumption.

## Exact implemented errors

These responses contain only `error` (no `ok`, `creator`, `stories` or `summary`)
and use JSON content type. This table describes middleware/handler outcomes for
ordinary GET requests; malformed HTTP/JSON rejected earlier by the framework
is not a new Creator Studio error contract.

| HTTP | Exact body | Implemented condition |
| --- | --- | --- |
| 401 | `{"error":"Authentication required"}` | Missing Authorization, wrong prefix, or empty token after `Bearer ` |
| 401 | `{"error":"Invalid or expired session"}` | `auth.getUser(token)` returns an error or no user |
| 401 | `{"error":"Could not verify session"}` | Session verification throws (including admin-client acquisition in this middleware) |
| 403 | `{"error":"Creator profile not found or inactive"}` | Initial lookup has no active profile, or ownership helper throws `CreatorAuthError` for missing/inactive/not-owned creator |
| 500 | `{"error":"Failed to fetch creator stories"}` | Non-`CreatorAuthError` thrown inside the stories handler |
| 500 | `{"error":"Failed to fetch creator summary"}` | Non-`CreatorAuthError` thrown inside the summary handler |

Important implemented distinctions:

- Initial active-creator lookup DB errors, including `maybeSingle` ambiguity,
  propagate as endpoint-specific 500.
- The subsequent ownership helper converts its lookup DB error or absent row
  into `CreatorAuthError`, so **that helper-level DB failure returns 403**.
  Ownership mismatch or a profile becoming inactive also returns 403.
- Joined candidate query errors return endpoint-specific 500. A missing exact
  count (`count === null`) returns summary 500, not a zero success.
- An authenticated unknown path under `/api/content` falls through to Express's
  framework 404 (currently HTML `Cannot GET ...`), not an invented JSON envelope.
  Without authentication, the same unknown path is intercepted with 401
  `{"error":"Authentication required"}` before route matching.
- Logger diagnostics are `GET_CREATOR_STORIES_FAILED` and
  `GET_CREATOR_SUMMARY_FAILED`; they are not extra response fields.

## Evidence and choices

- Migration 056 defines creator ownership, display_name and active status.
- Migration 057 defines candidate fields/statuses and the one-active-permission
  partial unique index. Its creator-read RLS requires granted/non-revoked
  permission. Service-role queries enforce these boundaries explicitly.
- `storyPermissionCheck.ts` establishes offered/shared eligibility; these reads
  share its exported status constant and express its permission rules in a joined
  SELECT, avoiding per-candidate permission queries.
- Existing `/ideas` provides the `ok`, creator `id/name/capabilities` envelope.
  `roundWebContract.ts` provides the minimal candidate narrative fields.
- Migrations 059 and 069 distinguish story-linked generated content from
  round-owner content. `docs/web-creator-dashboard-contract-audit.md` confirms
  `player_stories` is not a creator content source.
- Narrow `git log --all -G 'creator-summary|router.get\("/stories"'` inspection of
  content.ts found no previous implementation of either GET. Relevant history
  includes `c31e985` (/ideas), `bc62ab7` (permission revocation), `75a44a6`
  (round contract) and `9539141` (advanced capabilities). These establish
  adjacent behavior, not a recovered exact contract for the missing handlers.

The array envelope/key `stories`, candidate field selection/order, and
`summary.storyCount` are explicit local contract decisions grounded in those
records. They are **not** claims about the unavailable Vercel frontend's exact
expectations. No unsupported engagement, follower, revenue, publishing, or
generation metrics are supplied.

## Compatibility and verification boundaries

The Vercel Creator Studio source is unavailable here. Its expected envelopes,
field aliases, list joins, filters/pagination, summary metric names and whether
its “stories” screen expects candidates or generated creator content cannot be
verified. A separate frontend comparison must confirm or adapt consumers to the
documented responses, rather than assuming local API tests establish integration.

The historical [web dashboard audit](web-creator-dashboard-contract-audit.md)
concerns `/ideas` and rounds, not aliases or metrics for these two reads.
Its historical production/schema assertions must not be treated as current
live verification.

Current source, local bundle, intended release configuration and actual serving
deployment are distinct evidence layers. Local mocked tests cannot verify live
PostgREST joins/counts, applied migrations, release identity or Vercel targeting.
An unauthenticated 401 cannot establish handler availability because middleware
runs before matching, including unknown paths.
See [the handoff](creator-studio-release-verification.md) for commands, the
per-endpoint local/live matrix, observed responses and precise outstanding
release evidence. No Production deployment or restart is authorized by this
document or its verification work.
