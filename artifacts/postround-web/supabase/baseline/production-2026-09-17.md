# Production Supabase baseline — 2026-09-17

## Purpose and limits

This is the auditable starting point for production objects whose original
migration chain is not available in the accessible repository.

The inventory was verified read-only through the connected production
PostgREST API on 2026-09-17. Column names come from one returned row where a
table contained data. An empty table proves the table was exposed but does not
reveal its columns. PostgREST does not expose complete DDL, constraints,
indexes, triggers, grants, policies, functions, or the private
`supabase_migrations.schema_migrations` ledger, so this file must not be treated
as executable SQL.

## Provenance states

- **checked-in migration:** DDL is available in `../migrations`.
- **recovered historical migration:** original SQL was recovered and checked in,
  but its production ledger entry could not be verified.
- **baseline only:** production existence was verified, but complete historical
  DDL/application provenance is unavailable.

## Table inventory

| Table | Provenance | Live columns observed |
| --- | --- | --- |
| `waitlist` | checked-in migration `001_waitlist.sql` | `created_at`, `email`, `id`, `name` |
| `profiles` | checked-in migrations `002_profiles.sql`, `003_admin_user_management.sql`; later production evolution is baseline only | `created_at`, `creator_prompt_seen`, `current_period_end`, `display_name`, `dominant_hand`, `email`, `favorite_creator_id`, `handicap`, `handicap_index`, `handicap_rounds`, `home_course`, `home_course_id`, `id`, `last_handicap_update`, `lowest_handicap`, `preferred_tees`, `report_credits_remaining`, `role`, `round_buddy_intro_seen`, `story_sharing_prompt_preference`, `story_voice_style`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_currency`, `subscription_plan`, `subscription_status`, `updated_at`, `voice_auto_capture` |
| `admin_audit_log` | checked-in migration `003_admin_user_management.sql` | Table exposed; no row was available to infer columns |
| `rounds` | baseline only; older partial DDL exists in historical artifacts | `adjusted_gross_score`, `ai_summary`, `albatrosses`, `back_9`, `birdies`, `bogeys`, `course_id`, `course_name`, `course_par`, `course_rating`, `created_at`, `double_bogeys`, `eagles`, `fairways_hit`, `fairways_left`, `fairways_long`, `fairways_missed`, `fairways_playable`, `fairways_right`, `fairways_short`, `front_9`, `gir_hit`, `gir_left`, `gir_long`, `gir_missed`, `gir_playable`, `gir_right`, `gir_short`, `handicap_used`, `hole_in_one`, `id`, `pars`, `played_at`, `player_notes`, `round_scope`, `sand_save_opportunities`, `score_differential`, `score_to_par`, `scrambling_opportunities`, `selected_hole_numbers`, `slope_rating`, `status`, `successful_sand_saves`, `successful_scrambles`, `tees`, `three_putts`, `total_fairways`, `total_gir`, `total_penalties`, `total_putts`, `total_score`, `triple_bogeys`, `updated_at`, `user_id`, `voice_recap_credit_consumed` |
| `holes` | baseline only; older partial DDL exists in historical artifacts | `ai_feedback`, `bunker_shot`, `chip_count`, `created_at`, `distance_to_pin_yards`, `fairway_result`, `gir_result`, `hole_number`, `id`, `par`, `penalty_strokes`, `playable_fairway_miss`, `playable_gir_miss`, `player_notes`, `putts`, `round_id`, `sand_save`, `sand_shot_count`, `score`, `scramble_opportunity`, `scramble_success`, `updated_at`, `voice_transcript` |
| `content_ideas` | baseline only | `category`, `content_type`, `created_at`, `hook`, `id`, `reflection`, `round_id`, `script`, `stats_used`, `status`, `story_angle`, `story_id`, `title`, `why_interesting` |
| `vad_telemetry_events` | baseline only | `client_round_id`, `created_at`, `event_type`, `hole_number`, `id`, `metadata`, `source`, `user_id` |
| `creator_profiles` | recovered historical migration `056_creator_identity.sql` | `avatar_url`, `bio`, `created_at`, `display_name`, `id`, `status`, `updated_at`, `user_id` |
| `creator_social_accounts` | recovered historical migration `056_creator_identity.sql` | Table exposed; no row was available to infer columns |
| `story_candidates` | recovered historical migration `057_story_candidates.sql` | `created_at`, `headline`, `id`, `round_id`, `significance_score`, `status`, `story_data`, `story_type`, `summary`, `updated_at`, `user_id` |
| `story_permissions` | recovered historical migrations `057_story_candidates.sql` and `058_creator_story_approval_requests.sql` | `approval_requested_at`, `created_at`, `creator_id`, `granted_at`, `id`, `permission_granted`, `revoked_at`, `story_id`, `updated_at`, `user_id` |

This inventory covers tables used by the accessible web/API code and recovered
historical schema artifacts. It is not a claim that no other production tables
exist.

## Explicit unresolved item

An older rounds artifact included `rounds.input_method` with a historical check
constraint. The live row shape observed on 2026-09-17 did not include that
column. This baseline intentionally does not add, remove, or redefine it.