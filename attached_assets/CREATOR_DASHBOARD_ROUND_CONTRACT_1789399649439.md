# Creator Dashboard Round Contract

**Endpoint:** `GET /api/content/ideas?story_id=<uuid>`  
**Auth:** Bearer token (must belong to an active `creator_profiles` row)

This is the single API call the Web Creator Dashboard needs to render a complete content idea — including the associated round, player identity, and per-hole scorecard. No additional queries to `rounds`, `holes`, `profiles`, or `story_candidates` are required.

---

## Response shape

```json
{
  "ok": true,
  "ideas": [
    {
      "id": "<uuid>",
      "story_id": "<uuid>",
      "category": "Statistical Insight",
      "title": "Only 27 putts in a full round",
      "hook": "This golfer proved putting is a skill anyone can learn.",
      "script": "Twenty-seven putts is exceptional…",
      "created_at": "2026-09-04T10:00:00Z",
      "round": {
        "player_display_name": "Aaron",
        "played_at": "2026-09-01",
        "course_name": "Pebble Beach Golf Links",
        "tees": "White",
        "total_score": 92,
        "course_par": 72,
        "front_9": 46,
        "back_9": 46,
        "total_putts": 27,
        "total_penalties": 2,
        "fairways_hit": 8,
        "total_fairways": 14,
        "fairways_left": 2,
        "fairways_right": 2,
        "fairways_long": 1,
        "fairways_short": 1,
        "gir_hit": 5,
        "total_gir": 18,
        "gir_short": 4,
        "gir_long": 2,
        "gir_left": 4,
        "gir_right": 3,
        "scrambling_opportunities": 9,
        "successful_scrambles": 4,
        "three_putts": 2,
        "birdies": 1,
        "pars": 8,
        "bogeys": 7,
        "double_bogeys": 2,
        "input_method": "scorecard",
        "scorecard": [
          {
            "hole": 1,
            "par": 4,
            "score": 5,
            "fairway": "hit",
            "gir": "short",
            "putts": 2,
            "chips": 1,
            "bunker": false,
            "sand_save": null,
            "penalties": 0,
            "player_note": "Good drive, missed the green"
          }
        ]
      }
    }
  ]
}
```

---

## Field reference

### Top-level idea fields

| Field | Type | Source |
|---|---|---|
| `id` | UUID | `content_ideas.id` |
| `story_id` | UUID | `content_ideas.story_id` → `story_candidates.id` |
| `category` | string | `content_ideas.category` |
| `title` | string | `content_ideas.title` |
| `hook` | string | `content_ideas.hook` |
| `script` | string | `content_ideas.script` |
| `created_at` | ISO 8601 | `content_ideas.created_at` |
| `round` | object \| null | Joined from `rounds` via `content_ideas.round_id`; null for legacy ideas with no linked round |

### `round` object

| Field | Type | Source |
|---|---|---|
| `player_display_name` | string \| null | `profiles.display_name` (looked up by `rounds.user_id`); null if profile unavailable |
| `played_at` | date string | `rounds.played_at` |
| `course_name` | string \| null | `rounds.course_name` |
| `tees` | string \| null | `rounds.tees` |
| `total_score` | integer \| null | `rounds.total_score` |
| `course_par` | integer \| null | `rounds.course_par` |
| `front_9` | integer \| null | `rounds.front_9` |
| `back_9` | integer \| null | `rounds.back_9` |
| `total_putts` | integer \| null | `rounds.total_putts` |
| `total_penalties` | integer \| null | `rounds.total_penalties` |
| `fairways_hit` | integer \| null | `rounds.fairways_hit` |
| `total_fairways` | integer \| null | `rounds.total_fairways` |
| `fairways_left` | integer \| null | `rounds.fairways_left` |
| `fairways_right` | integer \| null | `rounds.fairways_right` |
| `fairways_long` | integer \| null | `rounds.fairways_long` |
| `fairways_short` | integer \| null | `rounds.fairways_short` |
| `gir_hit` | integer \| null | `rounds.gir_hit` |
| `total_gir` | integer \| null | `rounds.total_gir` |
| `gir_short` | integer \| null | `rounds.gir_short` |
| `gir_long` | integer \| null | `rounds.gir_long` |
| `gir_left` | integer \| null | `rounds.gir_left` |
| `gir_right` | integer \| null | `rounds.gir_right` |
| `scrambling_opportunities` | integer \| null | `rounds.scrambling_opportunities` |
| `successful_scrambles` | integer \| null | `rounds.successful_scrambles` |
| `three_putts` | integer \| null | `rounds.three_putts` |
| `birdies` | integer \| null | `rounds.birdies` |
| `pars` | integer \| null | `rounds.pars` |
| `bogeys` | integer \| null | `rounds.bogeys` |
| `double_bogeys` | integer \| null | `rounds.double_bogeys` |
| `input_method` | `"scorecard"` \| `"voice_recap"` \| `"guided_ai"` \| null | `rounds.input_method` |
| `scorecard` | array | See below; sorted ascending by hole number |

### `round.scorecard[]` entries

| Field | Type | Source |
|---|---|---|
| `hole` | integer | `holes.hole_number` |
| `par` | integer \| null | `holes.par` |
| `score` | integer \| null | `holes.score` |
| `fairway` | `"hit"` \| `"left"` \| `"right"` \| `"short"` \| `"none"` \| null | `holes.fairway_result` |
| `gir` | `"hit"` \| `"short"` \| `"long"` \| `"left"` \| `"right"` \| `"none"` \| null | `holes.gir_result` |
| `putts` | integer \| null | `holes.putts` |
| `chips` | integer \| null | `holes.chip_count` |
| `bunker` | boolean \| null | `holes.bunker_shot` |
| `sand_save` | boolean \| null | `holes.sand_save` |
| `penalties` | integer \| null | `holes.penalty_strokes` |
| `player_note` | string \| null | `holes.player_notes` — per-hole player context; populated by Round Buddy rounds when the player spoke about a hole |

---

## Backward compatibility

- Ideas with no linked round (`round_id IS NULL`) return `round: null`. All idea-level fields are unaffected.
- If the player's profile row is missing, `player_display_name` is `null`; the rest of the round object is returned normally.
- The `id`, `user_id`, `holes` (raw), and embedded join keys from `rounds` are not exposed in the response.

---

## Permission model

The endpoint enforces:
1. The calling user must own an active `creator_profiles` row.
2. A `story_permissions` row must exist for `(story_id, creator_id)` with `permission_granted = true` and `revoked_at IS NULL`.
3. The story candidate must have status `offered` or `shared`.

Requests that fail any of these checks receive `403`. Unauthenticated requests receive `401`.
