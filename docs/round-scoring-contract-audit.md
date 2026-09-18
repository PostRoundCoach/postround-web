# Round Scoring Contract Audit

**Completed:** 2026-09-18  
**Scope:** Inspection and recommendations only. No application code, API contract, migration, schema, or data was changed.

## Executive conclusion

Use `holes` as the canonical, auditable truth for hole-by-hole scoring and performance evidence. Use `rounds` as a stable, denormalized summary contract for completed or explicitly scoped rounds.

The connected production baseline verifies that `rounds.eagles`, `rounds.albatrosses`, and `rounds.hole_in_one` exist. Current API SELECTs expose them end to end. It does **not** verify their defaults, nullability, constraints, generated expressions, triggers, or writer calculations. No current round writer, mobile source, or complete `rounds`/`holes` DDL is present in the accessible workspace. Therefore this audit does not claim that any save path currently calculates those fields correctly.

The recommended contract is:

- Persist stable round summaries that are frequently queried, sorted, compared, or rendered without loading every hole.
- Derive every persisted summary from the same eligible set of complete hole rows at write/finalization time.
- Keep `holes` authoritative for recounts, scorecard rendering, category definitions, and reconciliation.
- Preserve `null` as “not available/not computable”; use `0` only when the required hole evidence is complete and the measured event did not occur.
- Do not maintain both stored and independently recomputed values in the same response without an explicit reconciliation rule.

## Evidence hierarchy and limits

1. **Connected production baseline:** `artifacts/postround-web/supabase/baseline/production-2026-09-17.md:5-14,24-32` verifies live table/column presence through production PostgREST. It cannot prove DDL, constraints, defaults, triggers, generated expressions, policies, or migration history.
2. **Current runtime reads and types:** current API and web SELECTs prove what consumers expect and expose, not how values are written.
3. **Current tests and fixtures:** prove compatibility expectations, not production persistence behavior.
4. **Historical SQL attachments:** document an older partial schema only. They conflict with the connected baseline in places and are not proof of the current schema.

The historical `rounds` DDL includes `course_par`, totals through `double_bogeys`, and an `input_method` column, but omits `score_to_par`, `triple_bogeys`, `eagles`, `albatrosses`, and `hole_in_one` (`attached_assets/Pasted-create-table-if-not-exists-public-rounds-id-uuid-primar_1785266615169.txt:1-40`). The connected baseline contains the omitted scoring fields and does not observe `input_method` (`artifacts/postround-web/supabase/baseline/production-2026-09-17.md:31,44-48`).

## Recommended canonical model

### Persist on `rounds`

Persist these nullable summary values:

- `total_score`, `course_par`, `score_to_par`
- `front_9`, `back_9`
- `total_putts`, `total_penalties`, `three_putts`
- `birdies`, `pars`, `bogeys`, `double_bogeys`, `triple_bogeys`
- `eagles`, `albatrosses`, `hole_in_one`
- `total_fairways`, `fairways_hit`, `fairways_left`, `fairways_right`, `fairways_short`, `fairways_long`, `fairways_missed`, `fairways_playable`
- `total_gir`, `gir_hit`, `gir_left`, `gir_right`, `gir_short`, `gir_long`, `gir_missed`, `gir_playable`
- `scrambling_opportunities`, `successful_scrambles`
- `sand_save_opportunities`, `successful_sand_saves`

These are appropriate summary fields because they are repeatedly consumed by dashboards, creator responses, reports, and historical comparisons. Persistence is a performance and contract-stability choice, not a second authority: each must remain reproducible from eligible hole evidence.

### Keep derived from `holes`

Do not add separate persisted round fields for:

- Individual hole score relative to par (`holes.score - holes.par`)
- Exact scored-hole sequence, streaks, turnarounds, “disaster” holes, exceptional holes, or relevant-hole lists
- Scorecard rows and per-hole notes
- Per-hole fairway/GIR/putt/chip/bunker/sand-save/penalty presentation
- Story-engine evidence such as “under par,” “two or more under par,” or adjacent-hole changes

These are detail-level facts or content interpretations. They must be computed from `holes` when needed.

### Exclude from the scoring aggregate contract

Keep these as metadata or handicap/report fields, not core scoring aggregates:

- `adjusted_gross_score`, `handicap_used`, `score_differential`
- `course_rating`, `slope_rating`
- `round_scope`, `selected_hole_numbers`, `status`
- `ai_summary`, `player_notes`, `voice_recap_credit_consumed`

They can remain on `rounds`, but they require their own definitions and lifecycle. They must not silently change the meaning of raw `total_score`, `course_par`, or hole-derived counts.

## Field-by-field matrix

Legend:

- **Web:** expected by a current web/API contract or direct dashboard consumer.
- **Round read:** selected from `rounds` by current code.
- **Hole derivation:** reproducible from current observed `holes` columns.
- **Writer:** calculation found in an accessible round-save path.
- **Recommendation:** `Persist`, `Derive`, or `Exclude` from the core scoring aggregate contract.
- **Conflict:** risk when stored summary and hole evidence can disagree.

| Field / concept | Web | Round read / API exposure | Hole derivation and semantics | Writer | Recommendation | Conflict |
|---|---|---|---|---|---|---|
| `total_score` | Yes | Player dashboards, creator round contract, persisted idea response, story generation | Sum non-null `holes.score` over the round’s selected/eligible holes; `null` until completeness policy is met | **Unverified** | Persist | High |
| `course_par` | Yes | Same broad paths as total score | Sum non-null `holes.par` over the same eligible holes; distinct from per-hole `par` | **Unverified** | Persist | High |
| `score_to_par` | Persisted creator response and historical story comparison; canonical `RoundHighlights` omits it | Selected from `rounds` for persisted ideas and prior-round history | `total_score - course_par`, only when both represent the same complete scope | **Unverified**; documentation calls it database-generated but DDL is unavailable | Persist | High |
| Per-hole score to par | Yes, scorecard styling and Creator Engine | Not a round field | `holes.score - holes.par`; null if either is null | Read-time calculations exist | Derive | Low |
| `front_9` | Yes | Dashboards and creator contracts | Sum scores for eligible holes 1–9; null unless required holes for the declared scope are complete | **Unverified** | Persist | High |
| `back_9` | Yes | Dashboards and creator contracts | Sum scores for eligible holes 10–18; null unless required holes are complete | **Unverified** | Persist | High |
| `birdies` | Yes | Dashboards and both creator response forms | Count `score - par = -1` | **Unverified** | Persist | High; current story engine informally labels every `< 0` hole as a “birdie” collection |
| `eagles` | Yes in creator contracts | Selected and passed through from `rounds` | Recommended count `score - par = -2`; do not use `<= -2` if categories are intended to be exact | **Unverified** | Persist | High; attached contract defines `par - score >= 2`, overlapping albatrosses |
| `albatrosses` | Yes in persisted/canonical creator reads | Selected and passed through from `rounds` | Count `score - par = -3` | **Unverified** | Persist | High |
| `hole_in_one` | Yes in persisted/canonical creator reads; detail scorecard also labels score 1 as Ace | Selected and passed through from `rounds` | Count `holes.score = 1`, independent of par category | **Unverified** | Persist | High; intentionally may overlap eagle/albatross |
| `pars` | Yes | Dashboards and creator responses | Count `score - par = 0` | **Unverified** | Persist | High |
| `bogeys` | Yes | Dashboards and creator responses | Count `score - par = 1` | **Unverified** | Persist | High |
| `double_bogeys` | Yes | Dashboards and creator responses | Count `score - par = 2` | **Unverified** | Persist | High; UI label “Doubles+” is inaccurate if this is exact |
| `triple_bogeys` | Persisted idea response only; absent from canonical `RoundHighlights` | Selected by persisted candidate retrieval | Count `score - par = 3` | **Unverified** | Persist | High; contract drift |
| Quadruple-or-worse count | No stored consumer found | No observed column | Count `score - par >= 4` if a future report needs it | None | Derive/exclude until required | Low |
| `total_putts` | Yes | Dashboards and creator responses | Sum `holes.putts`; null when per-hole putting coverage is insufficient | **Unverified** | Persist | High |
| `three_putts` | Yes in creator responses | Selected from `rounds` | Count holes with `putts >= 3`; null when putting evidence unavailable, zero only with complete measured evidence | **Unverified** | Persist | High; historical DDL default `0` can erase unknown/zero distinction |
| `total_penalties` | Yes in creator responses | Selected from `rounds` | Sum `holes.penalty_strokes`; null when coverage is unknown | **Unverified** | Persist | Medium/high |
| `total_fairways` | Yes | Dashboards and creator responses | Count eligible non-par-3 holes with a recorded fairway outcome under one documented denominator rule | **Unverified** | Persist | High |
| `fairways_hit` | Yes | Dashboards, scorecards, creator responses and story generation | Count `fairway_result = 'hit'` | **Unverified** | Persist | High |
| `fairways_left/right/short/long` | Creator contracts | Selected from `rounds` | Count exact directional result; live holes observed support result values, while historical constraint omitted `long` | **Unverified** | Persist | High |
| `fairways_missed` | Persisted idea response only | Selected from `rounds` | Prefer derived identity: eligible recorded misses; define whether it equals directional misses and whether unrecorded/`none` is excluded | **Unverified** | Persist only with invariant | High |
| `fairways_playable` | Persisted idea response only | Selected from `rounds` | Count observed `holes.playable_fairway_miss = true`; do not infer from direction | **Unverified** | Persist | High |
| `total_gir` | Yes | Dashboards and creator responses | Count holes eligible for/with a recorded GIR result under one denominator rule | **Unverified** | Persist | High |
| `gir_hit` | Yes | Dashboards, scorecards, creator responses and story generation | Count `gir_result = 'hit'` | **Unverified** | Persist | High |
| `gir_left/right/short/long` | Creator contracts | Selected from `rounds` | Count exact directional result | **Unverified** | Persist | High |
| `gir_missed` | Persisted idea response only | Selected from `rounds` | Prefer derived identity from recorded non-hit GIR results | **Unverified** | Persist only with invariant | High |
| `gir_playable` | Persisted idea response only | Selected from `rounds` | Count observed `holes.playable_gir_miss = true` | **Unverified** | Persist | High |
| `scrambling_opportunities` | Yes | Dashboards and creator responses | Count `holes.scramble_opportunity = true` | **Unverified** | Persist | High |
| `successful_scrambles` | Yes | Dashboards and creator responses | Count opportunity rows with `scramble_success = true`; success should imply opportunity | **Unverified** | Persist | High |
| `sand_save_opportunities` | Persisted idea response; attached creator contract | Selected from `rounds` | Define from explicit hole evidence (`sand_shot_count`/`bunker_shot` plus scoring outcome), not merely any bunker shot | **Unverified** | Persist after definition | High |
| `successful_sand_saves` | Persisted idea response; attached creator contract | Selected from `rounds` | Count explicit `holes.sand_save = true` among defined opportunities | **Unverified** | Persist after definition | High |
| `adjusted_gross_score` | No current scoring UI found | Live column observed | Handicap-rule calculation, not raw hole-score sum | **Unverified** | Exclude from core scoring contract | Medium |
| `score_differential` | No current scoring UI found | Live column observed | Handicap formula using adjusted score/rating/slope, not hole-only scoring | **Unverified** | Exclude from core scoring contract | Medium |

## Consumer traces

### Player dashboard

- The dashboard reads recent `rounds.total_score` and `rounds.course_par`, computes display score-to-par as subtraction, and compares recent best rounds using that difference (`artifacts/postround-web/src/app/(dashboard)/dashboard/page.tsx:54-67,89-95,215-220`).
- The rounds list directly reads stored score, par, front/back totals, score-category counts, putts, fairways, GIR, and scrambling (`artifacts/postround-web/src/app/(dashboard)/dashboard/rounds/page.tsx:49-62,90-163`).
- The rounds list still selects `input_method`, although the connected baseline and live probe say the column is absent/unresolved (`artifacts/postround-web/src/app/(dashboard)/dashboard/rounds/page.tsx:27,51-59`; baseline lines 44-48). This can fail the whole SELECT rather than merely omit the badge.
- Round detail uses `select('*')` for both tables, computes total score-to-par from stored round totals, renders stored summary totals, and separately renders hole rows (`artifacts/postround-web/src/app/(dashboard)/dashboard/rounds/[id]/page.tsx:87-108,145-203`).
- Its front/back table recomputes hole par, score, putts, fairway hits, and GIR hits for display, but prefers stored `front_9`/`back_9` subtotals when present (`.../[id]/page.tsx:261-334`). A mismatch can therefore appear within one screen.

### Canonical Creator round contract

- `roundSelect` reads stored summary columns from `rounds`; holes are fetched separately and sorted (`artifacts/api-server/src/lib/creator-content-data.ts:341-348,436-450`).
- `mapRoundHighlights` passes summary fields through without recalculation (`.../creator-content-data.ts:368-382`).
- Scorecard aliases are explicit: `hole_number → hole`, `fairway_result → fairway`, `gir_result → gir`, `chip_count → chips`, `bunker_shot → bunker`, `penalty_strokes → penalties`, and `player_notes → player_note` (`.../creator-content-data.ts:482-490`).
- Current `RoundHighlights` includes through doubles plus eagles/albatrosses/hole-in-one, but omits `score_to_par`, triple bogeys, missed/playable categories, and sand saves (`artifacts/postround-web/src/lib/creator-stories/contracts.ts:144-173`).

### Creator Content Engine

- Generation reads only stored round `total_score`/`course_par` plus detailed holes and prior stored `score_to_par` values (`artifacts/api-server/src/lib/creator-content-data.ts:535-569`).
- Hole story facts are derived from `holes.score - holes.par`; penalties and fairway/GIR counts are also derived from holes (`artifacts/api-server/src/lib/story-engine.ts:80-83,130-205`).
- Current-round progress is recomputed as `total_score - course_par`, while historical rounds use persisted `score_to_par` (`.../story-engine.ts:207-220`). Drift in stored history changes the comparison even if current subtraction is correct.
- The engine’s local `birdies` collection means all under-par holes (`diff < 0`), not exact birdies. It uses that collection for a generic under-par candidate, so the prose is safe but the variable/category name is misleading (`.../story-engine.ts:133-145`).

### Persisted Creator idea responses

- Candidate persistence stores generated text, supporting evidence, relevant holes, and the full scorecard snapshot in `content_ideas.stats_used` (`artifacts/api-server/src/lib/creator-content-data.ts:572-610`).
- Normal idea retrieval does not use that snapshot as the displayed round. It re-reads linked `rounds`, `holes`, and profile data, then reconstructs the response (`.../creator-content-data.ts:754-880`).
- This response has the broadest round contract: it includes `score_to_par`, triple bogeys, missed/playable fairway and GIR counts, sand saves, and eagles/albatrosses/hole-in-one (`.../creator-content-data.ts:626-740,777-867`).
- A persisted idea can therefore retain generation-time evidence in `stats_used` while its later returned `round` reflects current live round/hole rows. That is useful for audit history but must be recognized as two time slices.

### Scorecard rendering and export

- Creator scorecards use stored round totals for top-line score/putts/fairway/GIR and hole rows for detailed score-relative styling (`artifacts/postround-web/src/components/creator/CreatorRoundScorecard.tsx:17-34,64-90,94-168`).
- The share graphic recomputes display score-to-par from stored `total_score` and `course_par`; hole rows render score, par, and putts (`artifacts/postround-web/src/components/creator/ShareableScorecardGraphic.tsx:21-26,143-183`).
- Neither renderer reconciles stored summary values with hole totals.

## Verified status of eagles, albatrosses, and hole-in-one

| Question | Result |
|---|---|
| Do live production columns exist? | **Yes.** Connected production baseline observed `rounds.eagles`, `rounds.albatrosses`, and `rounds.hole_in_one` (`production-2026-09-17.md:31`). |
| Are they selected by current APIs? | **Yes.** Both canonical round and persisted idea paths select and return them (`creator-content-data.ts:341-348,368-382,777-778,861-863`). |
| Are they nullable in application contracts? | **Yes.** Current TypeScript contracts accept `number \| null` (`creator-content-data.ts:275-309,626-668`; `roundWebContract.ts:12-41`). |
| Are database nullability/defaults verified? | **No.** PostgREST row inspection cannot establish them. |
| Is a generated expression or trigger verified? | **No.** No current DDL or trigger definition is available. |
| Is any accessible save path verified to calculate them? | **No.** No current round writer exists in the workspace. |
| Are definitions consistent? | **No.** Attached documentation defines eagles as `par - score >= 2`, causing intentional overlap with albatrosses; an exact scoring breakdown normally defines eagle as exactly two under. Hole-in-one is independently `score = 1` and may legitimately overlap a relative-to-par category. |

Recommendation: adopt exact relative categories (`-2` eagle, `-3` albatross) and keep `hole_in_one` orthogonal. If product reporting intentionally wants “eagle or better,” expose that under that explicit name rather than storing overlapping `eagles`.

## Naming, nullability, and scope drift

1. **`par` versus `course_par`:** `holes.par` is per-hole truth; `rounds.course_par` is a summary over the declared round scope. They are not aliases. One connected 9-hole probe found them consistent, but one row does not prove a global invariant.
2. **`score_to_par` contract gap:** persisted Creator ideas and historical comparison use it; canonical `RoundHighlights` and player dashboards recompute subtraction.
3. **Scoring category gap:** triple bogeys are live and exposed by persisted ideas but absent from canonical `RoundHighlights` and player types.
4. **Directional gap:** canonical creator highlights include directional buckets but omit `fairways_missed/playable` and `gir_missed/playable`; persisted ideas include them.
5. **Scramble evidence gap:** canonical scorecard does not expose `scramble_opportunity` or `scramble_success`, although round highlights expose their aggregates. The API cannot locally audit those totals from its own response.
6. **Sand-save gap:** the persisted idea response includes round sand-save summaries and scorecard `sand_save`; canonical `RoundHighlights` omits the summaries.
7. **Fairway enum drift:** historical holes DDL permits hit/left/right/short/none but not `long`; current API/web types accept `long`.
8. **Unknown versus zero:** current contracts correctly allow null, but historical defaults of zero for three-putts and score categories can make missing hole coverage look measured. Every writer needs explicit completeness rules.
9. **Partial rounds:** live `round_scope`, `selected_hole_numbers`, and `status` exist, but current summary contracts do not carry them. Consumers cannot tell whether totals describe 9, 18, selected holes, or an unfinished round.
10. **“Doubles+” label:** dashboards render exact `double_bogeys` under a label implying double-or-worse, while `triple_bogeys` is separate and omitted from those pages.

## Mobile and writer coverage

No Expo, React Native, iOS, Android, or other mobile application source is available in this workspace. No current insert/update/upsert/RPC/trigger path for `rounds` or `holes` was found in the web/API code or checked-in migrations. The only round/hole write evidence is historical RLS policy text, which does not calculate aggregates.

Consequently:

- Mobile calculation of any summary field is **unverified**.
- Write-time handling of partial rounds, retries, edits, deleted holes, or changed round scope is **unverified**.
- End-to-end calculation of eagles, albatrosses, hole-in-one, triples, and all performance aggregates is **unverified**.
- Existing production values must be reconciled against holes before future constraints or trusted reporting are introduced.

## Recommended future migration and consistency sequence

These are recommendations only; this audit did not execute them.

1. **Recover authoritative writer/DDL evidence.** Obtain the mobile round-save source and production definitions for relevant columns, triggers, functions, constraints, and defaults.
2. **Freeze metric definitions.** Document exact eligible-hole, round-scope, completeness, overlap, and null/zero semantics. Resolve eagle exactness, doubles versus doubles+, sand-save opportunity, fairway/GIR denominators, and playable-miss definitions.
3. **Add a single reconciliation query/function.** Given a round, derive all summaries from eligible holes using the frozen definitions and return both derived and stored values without mutation.
4. **Audit production drift.** Compare every stored summary to derivation, grouped by round status/scope and writer/app version if available. Treat missing evidence separately from numeric disagreement.
5. **Backfill safely.** Backfill only fields whose required hole evidence is complete. Preserve null for incomplete/unmeasured metrics. Record before/after discrepancies.
6. **Centralize write-time calculation.** On round finalization and every subsequent hole edit/delete, calculate summaries in one transaction from holes. Do not let independent clients implement category logic.
7. **Add invariants.** Examples: `score_to_par = total_score - course_par` when all are non-null; success counts cannot exceed opportunities; exact scoring categories are non-negative; scope-aware front/back/total relationships hold when applicable.
8. **Align API contracts.** Define one shared summary shape or deliberate named subsets. Include scope/status when totals may be partial. Decide whether canonical responses expose persisted `score_to_par` or always derive it, but do not mix policies silently.
9. **Add reconciliation tests.** Cover 9-hole, 18-hole, selected-hole, partial, edited, deleted-hole, null telemetry, eagle, albatross, ace, triple, and worse-than-triple cases.
10. **Monitor post-deployment drift.** Compare stored summaries with hole derivations on sampled finalized rounds and alert without rewriting data automatically.

## Final contract decision

`holes` is the scoring authority. `rounds` is a nullable, scope-aware materialized summary contract. Persisted round metrics are valid only when produced by one centralized derivation over the same eligible holes and protected by reconciliation. Until the missing writer and DDL evidence is recovered, current production columns are verified as readable contract fields—not verified calculations.