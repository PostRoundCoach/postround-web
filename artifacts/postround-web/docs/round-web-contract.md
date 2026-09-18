# Round Web Contract

The authoritative checked-in contract for `GET /api/content/round/:round_id` is the supplied source document:

`attached_assets/ROUND_WEB_CONTRACT_1789736853356.md`

The endpoint preserves every nullable persisted round highlight value. The creator Round Highlights presentation additionally consumes the current authoritative `rounds.score_to_par` value, and the scoring category list consumes `rounds.triple_bogeys`; neither value is recalculated from scorecard holes.

## Creator highlight fields

All fields below are `integer | null` and pass through from the matching `rounds` column:

- `total_score`
- `course_par`
- `score_to_par`
- `front_9`
- `back_9`
- `total_putts`
- `total_penalties`
- `fairways_hit`
- `total_fairways`
- `fairways_left`
- `fairways_right`
- `fairways_long`
- `fairways_short`
- `gir_hit`
- `total_gir`
- `gir_short`
- `gir_long`
- `gir_left`
- `gir_right`
- `scrambling_opportunities`
- `successful_scrambles`
- `three_putts`
- `hole_in_one`
- `albatrosses`
- `eagles`
- `birdies`
- `pars`
- `bogeys`
- `double_bogeys`
- `triple_bogeys`

Authorization, scorecard fields, Creator Content Story, Coaching Reflection, response envelope, and error behavior remain as documented in the supplied contract.