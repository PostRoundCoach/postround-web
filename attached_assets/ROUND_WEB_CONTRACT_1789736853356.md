# Round Web Contract

**Endpoint:** `GET /api/content/round/:round_id`  
**Auth:** Bearer token (must belong to an active `creator_profiles` row with an active story permission)  
**Companion to:** `CREATOR_DASHBOARD_ROUND_CONTRACT.md` (the existing `GET /api/content/ideas` contract)

This is the unified round endpoint for the Web Creator Dashboard. It returns a complete view of a single round — including both independently generated experiences (Creator Content Story and Coaching Reflection) plus the full Round Highlights and Scorecard — in a single call.

The old `GET /api/content/ideas?story_id=<uuid>` endpoint is unchanged and continues to work as documented in `CREATOR_DASHBOARD_ROUND_CONTRACT.md`.

---

## Why a new endpoint?

The `GET /api/content/ideas` endpoint is keyed by `story_id` and returns a flat list of `content_ideas` rows. Creator Content Stories and Coaching Reflections are now two independently generated products per round. A round-scoped endpoint (`round_id`) allows the dashboard to:

1. Retrieve both experiences in a single call regardless of which (if any) are generated.
2. Get Round Highlights and Scorecard data without first knowing a `story_id`.
3. Mirror the authorization model of `/api/content/ideas` — same permission requirements, same security posture.

---

## Authorization model

Access requires **all four** of the following in order:

1. **Bearer token** — validated by `requireAuth` middleware (401 if missing or invalid).
2. **Active creator profile** — the authenticated user must own an active `creator_profiles` row, derived server-side. Clients never pass `creator_id` (403 if missing or inactive).
3. **Eligible story candidate** — a `story_candidates` row with `status IN ('offered', 'shared')` must exist for the round (403 if not). Private, expired, and any other statuses block access without leaking round data.
4. **Active story permission** — a `story_permissions` row with `permission_granted = true` AND `revoked_at IS NULL` must exist for `(story_id, creator_id)` (403 if not). Pending and revoked states both block access.

This matches the existing `/api/content/ideas` permission model and the `resolveStoryPermission` helper in `storyPermissionCheck.ts`.

**Multiple permission rows:** The schema permits historical revoked rows per `(story_id, creator_id)` when a creator is re-shared after revocation. The active-permission query filters to `permission_granted=true AND revoked_at IS NULL` with `.limit(1)` so historical rows never cause conflicts.

---

## Error responses

| Status | Condition |
|--------|-----------|
| `400` | `round_id` is not a valid UUID |
| `401` | No bearer token or invalid token |
| `403` | No active `creator_profiles` row for the authenticated user |
| `403` | No eligible `story_candidates` row for the round (status must be `offered` or `shared`) |
| `403` | No active `story_permissions` row for `(story_id, creator_id)` — includes pending and revoked states |
| `404` | Round does not exist |
| `500` | Unexpected server error or DB failure |

---

## Response shape

```json
{
  "ok": true,
  "contract": {
    "round": { ... },
    "roundHighlights": { ... },
    "scorecard": [ ... ],
    "creatorContentStory": { "available": true | false, ... },
    "coachingReflection": { "available": true | false, ... }
  }
}
```

See `docs/round-web-contract-sample.json` for annotated full examples.

---

## Field reference

### `round` object

| Field | Type | Source |
|---|---|---|
| `played_at` | date string | `rounds.played_at` |
| `course_name` | string \| null | `rounds.course_name` |
| `tees` | string \| null | `rounds.tees` |
| `player_display_name` | string \| null | `profiles.display_name` (looked up by `rounds.user_id`); null if profile unavailable |

**Not exposed:** `rounds.id`, `rounds.user_id` — internal identifiers are not returned.

---

### `roundHighlights` object

All fields are `integer | null`.

| Field | Source |
|---|---|
| `total_score` | `rounds.total_score` |
| `course_par` | `rounds.course_par` |
| `front_9` | `rounds.front_9` |
| `back_9` | `rounds.back_9` |
| `total_putts` | `rounds.total_putts` |
| `total_penalties` | `rounds.total_penalties` |
| `fairways_hit` | `rounds.fairways_hit` |
| `total_fairways` | `rounds.total_fairways` |
| `fairways_left` | `rounds.fairways_left` |
| `fairways_right` | `rounds.fairways_right` |
| `fairways_long` | `rounds.fairways_long` |
| `fairways_short` | `rounds.fairways_short` |
| `gir_hit` | `rounds.gir_hit` |
| `total_gir` | `rounds.total_gir` |
| `gir_short` | `rounds.gir_short` |
| `gir_long` | `rounds.gir_long` |
| `gir_left` | `rounds.gir_left` |
| `gir_right` | `rounds.gir_right` |
| `scrambling_opportunities` | `rounds.scrambling_opportunities` |
| `successful_scrambles` | `rounds.successful_scrambles` |
| `three_putts` | `rounds.three_putts` |
| `birdies` | `rounds.birdies` |
| `pars` | `rounds.pars` |
| `bogeys` | `rounds.bogeys` |
| `double_bogeys` | `rounds.double_bogeys` |
| `triple_bogeys` | `rounds.triple_bogeys` |
| `eagles` | `rounds.eagles` |
| `albatrosses` | `rounds.albatrosses` |
| `hole_in_one` | `rounds.hole_in_one` |

**Compatibility note:** These are identical to the fields in `round` inside `GET /api/content/ideas`. No fields have been removed.

---

### `scorecard[]` entries

Sorted ascending by hole number.

| Field | Type | DB source | Prior contract field? |
|---|---|---|---|
| `hole` | integer | `holes.hole_number` (renamed) | ✅ Same |
| `par` | integer \| null | `holes.par` | ✅ Same |
| `score` | integer \| null | `holes.score` | ✅ Same |
| `fairway` | `"hit"` \| `"left"` \| `"right"` \| `"short"` \| `"long"` \| `"none"` \| null | `holes.fairway_result` (renamed) | ✅ Same |
| `gir` | `"hit"` \| `"short"` \| `"long"` \| `"left"` \| `"right"` \| `"none"` \| null | `holes.gir_result` (renamed) | ✅ Same |
| `putts` | integer \| null | `holes.putts` | ✅ Same |
| `chips` | integer \| null | `holes.chip_count` (renamed) | ✅ Same |
| `bunker` | boolean \| null | `holes.bunker_shot` (renamed) | ✅ Same |
| `sand_save` | boolean \| null | `holes.sand_save` | ✅ Same |
| `penalties` | integer \| null | `holes.penalty_strokes` (renamed) | ✅ Same |
| `player_note` | string \| null | `holes.player_notes` (renamed) — per-hole player context from Round Buddy | ✅ Same |

---

### `creatorContentStory`

#### When `available: false`

```json
{ "available": false }
```

Returned when the story candidate exists and permission is active, but no `creator_story` content_idea has been generated yet (`contentIdea: null` is used within `available: true` for this case — see below). `available: false` is only returned when the candidate row was absent at the time of contract construction; this state cannot normally occur in a 200 response since the presence of an eligible candidate is required for authorization.

> **Note:** In practice, the endpoint only returns 200 when authorization passes (eligible candidate + active permission). The `creatorContentStory.available` field reflects whether a `creator_story` content_idea exists; use `contentIdea: null` to distinguish "no content yet" from "no story relationship".

#### When `available: true`

```json
{
  "available": true,
  "permissionState": "granted",
  "permission": { ... },
  "candidate": { ... },
  "contentIdea": { ... } | null
}
```

**`permissionState`**

Always `"granted"` in any successful (200) response. The endpoint returns 403 for pending, revoked, or absent permission rows, so this field is always `"granted"` when the contract is returned.

**`permission` object**

| Field | Type | Source |
|---|---|---|
| `granted_at` | ISO 8601 \| null | `story_permissions.granted_at` |
| `revoked_at` | ISO 8601 \| null | `story_permissions.revoked_at` — always `null` in 200 responses (active permission required) |
| `approval_requested_at` | ISO 8601 \| null | `story_permissions.approval_requested_at` |

**`candidate` object**

| Field | Type | Source |
|---|---|---|
| `id` | UUID | `story_candidates.id` |
| `story_type` | string | `story_candidates.story_type` |
| `headline` | string | `story_candidates.headline` |
| `summary` | string | `story_candidates.summary` |
| `status` | `"offered"` \| `"shared"` | `story_candidates.status` — always an eligible status in 200 responses |

**`contentIdea` object** (null if not yet generated)

| Field | Type | Source |
|---|---|---|
| `id` | UUID | `content_ideas.id` |
| `category` | string (narrative lens) | `content_ideas.category` |
| `title` | string | `content_ideas.title` |
| `hook` | string | `content_ideas.hook` |
| `script` | string \| null | `content_ideas.script` |
| `story_angle` | string \| null | `content_ideas.story_angle` |
| `why_interesting` | string \| null | `content_ideas.why_interesting` |
| `created_at` | ISO 8601 | `content_ideas.created_at` |

**Source filter:** Only rows with `content_type = 'creator_story'` and `status != 'generating'` are used. `player_stories` rows are never included.

---

### `coachingReflection`

Independent of `creatorContentStory.contentIdea` generation state — the Coaching Reflection Engine runs separately from the Creator Content Engine.

#### When `available: false`

```json
{ "available": false }
```

Returned when no `coaching_reflection` `content_ideas` row (with `status != 'generating'`) exists for the round's story candidate.

#### When `available: true`

```json
{
  "available": true,
  "content": {
    "id": "...",
    "title": "...",
    "hook": "...",
    "reflection": "...",
    "script": "...",
    "created_at": "..."
  }
}
```

| Field | Type | Source |
|---|---|---|
| `id` | UUID | `content_ideas.id` |
| `title` | string | `content_ideas.title` |
| `hook` | string | `content_ideas.hook` |
| `reflection` | string \| null | `content_ideas.reflection` (coaching narrative) |
| `script` | string \| null | `content_ideas.script` (backward-compatible alias) |
| `created_at` | ISO 8601 | `content_ideas.created_at` |

**Source filter:** Only rows with `category = 'coaching_reflection'`, `story_id = candidate.id`, and `status != 'generating'` are used.

---

## Data isolation guarantees

- `player_stories` is never queried by this endpoint.
- The `creator_id` is resolved server-side from the bearer token. Clients cannot supply or impersonate a different creator.
- Queries are scoped to the specific `round_id`. Content from other rounds never appears.
- The permission query uses `permission_granted=true AND revoked_at IS NULL` to ensure only the active-grant row is matched, even when historical revoked rows exist for the same `(story_id, creator_id)` pair.

---

## Compatibility with `GET /api/content/ideas`

| Aspect | Old endpoint | New endpoint |
|---|---|---|
| Key | `story_id` (query param) | `round_id` (path param) |
| Permission enforcement | Hard 403 if no active permission (`permission_granted=true`, `revoked_at IS NULL`) | Same: 403 for pending, revoked, or absent |
| Candidate eligibility | `offered` or `shared` required | Same |
| Ideas returned | Array of all `content_ideas` for the story | One creator story + one coaching reflection |
| Round data | Nested inside each idea object | Top-level `round` + `roundHighlights` + `scorecard` keys |
| Backward compatibility | Unchanged | New endpoint — no changes to existing contract |

**No fields have been removed from the existing contract.** The `roundHighlights` and `scorecard` fields in the new endpoint are a strict superset of the `round` fields in `GET /api/content/ideas`.

---

## TypeScript types

Defined in `artifacts/api-server/src/lib/roundWebContract.ts`:

```typescript
RoundWebContract            // Top-level contract
RoundSummary                // round object
RoundHighlights             // roundHighlights object
ScorecardEntry              // scorecard[] entries
CreatorContentStory         // creatorContentStory (union: available | unavailable)
CoachingReflection          // coachingReflection (union: available | unavailable)
PermissionState             // "granted" — always "granted" in 200 responses
StoryCandidateSummary       // candidate sub-object
StoryPermissionTimestamps   // permission sub-object
CreatorContentIdeaSummary   // contentIdea sub-object
CoachingReflectionContent   // content sub-object
```

No `any` types are used. Raw Supabase response shapes are never exported.
