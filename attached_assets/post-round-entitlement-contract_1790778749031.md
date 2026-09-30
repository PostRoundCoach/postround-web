# Post Round Entitlement Contract

Current checked-in Expo/API contract for carrying **copy and entitlement displays** to another project. “PR Credits” (or “credits”) means the shared, plan-included allowance unless explicitly called **purchased credits**. This is not a claim about the state of a particular production database or Stripe account.

## 1. Plans

| Plan | Price | Included Credits | Reports | Key Access |
| --- | --- | --- | --- | --- |
| Free | $0 | 10 PR Credits **lifetime**, not monthly | 10 AI Round Reports for **new** accounts, lifetime counter; existing balances may differ | Traditional Scorecard; Round Buddy, AI Coaching, Voice Recap and Player Stories subject to available credits. No Player DNA, Historical Trends or Practice Plans. |
| Player | Monthly Stripe price for selected CAD or USD Price ID; obtain live amount from `/api/billing/prices` | 40 PR Credits/month | Unlimited AI Round Reports while subscription is active or trialing | Unlimited round capture, Player DNA, Historical Trends and Practice Plans, plus credit-limited AI features. |
| Performance | Monthly Stripe price for selected CAD or USD Price ID; obtain live amount from `/api/billing/prices` | 120 PR Credits/month (not unlimited PR Credits) | Unlimited AI Round Reports while subscription is active or trialing | Player features plus advertised advanced analytics and premium coaching features; credit allowance remains finite. |

The server looks up `subscription_plans` at runtime; the later 20260922 credit migration sets 10/40/120 and the new-profile report default to 10. Those figures assume the migration has been applied. The original plan seed and older comments are not current pricing or credit copy. The mobile screen gets Stripe amounts through the public prices endpoint, but temporarily falls back to bundled CAD/USD display amounts if the lookup is pending or fails; checkout resolves configured Stripe Price IDs, **not** the fallback table. Device region `CA` selects CAD, all other regions USD. No fixed paid-plan or pack amount can be guaranteed from checked-in code alone. [S1, S2, S3]

**Trial treatment:** `trialing` is treated like `active` for the subscribed plan’s feature flags, credits and unlimited reports. `past_due`, `canceled` or otherwise unhealthy subscriptions fall back to Free access for feature checks; this does not automatically grant a fresh lifetime balance. No trial length or automatic free trial offer is established here. [S4, S6]

## 2. Feature Access

| Feature | Free | Player | Performance | PR Credits | Notes |
| --- | --- | --- | --- | --- | --- |
| Traditional Scorecard / round capture | Basic scorecard | Unlimited round capture | Unlimited round capture | None established | Plan flag and upgrade copy distinguish paid unlimited capture; do not claim that Free cannot save rounds. [S1, S4] |
| Round Buddy | Available within lifetime pool | Available within monthly pool | Available within monthly pool | Finalized round: 1–3 holes 0, 4–9 holes 1, 10–18 holes 2 | Holes are reserved/committed during play, then adjusted on session finalization; the initial gate still blocks play at zero included capacity, even for a potentially free 1–3-hole finish. No purchased-credit fallback in the Round Buddy access check. [S4, S5] |
| AI Coaching | Available with capacity | Available with capacity | Available with capacity | 2 per completed, verified coaching session | Purchased-credit fallback can cover 2 when included capacity is exhausted. A report generated for that session is not a second coaching charge. [S4, S7] |
| Voice Recap | Available with capacity | Available with capacity | Available with capacity | 2 from included pool per saved session | Purchased-credit path disagrees with the displayed 2-credit rule; see Needs Confirmation. Server requires evidence of a successful voice session and avoids double charging a round. [S8] |
| Player Stories | Available with capacity | Available with capacity | Available with capacity | 1 per generated story | An owned completed round qualifies without a creator-qualified candidate. Existing/retried generated stories are not a new generation charge; purchased-credit fallback exists. [S9] |
| Roast My Round | Voice style for Player Stories | Same | Same | No separate surcharge established; follows Player Story generation | Not a standalone subscription tier or separately charged feature in the checked routes. [S10] |
| AI Round Report (scorecard) | Separate lifetime report balance | Unlimited | Unlimited | **0**; one report allowance per new round report | Free report counter decremented before generation and rolled back on failure; repeat completed report is cached. A verified Round Buddy round may receive its overview without a separate report debit. [S6, S7] |
| Player DNA, Historical Trends, Practice Plans | Not enabled | Enabled | Enabled | None | Boolean plan flags, not credit-purchasable unlocks. [S1, S4] |

## 3. PR Credit Rules

- The **included** PR Credit pool is shared across Round Buddy, AI Coaching, Voice Recap and Player Story generation. Free usage is aggregated over all periods (lifetime); paid usage is scoped to the current UTC-month usage period. Included credits do not mean unlimited sessions. One included credit corresponds to 18 accounting units; Round Buddy reserves hole units during play and applies the final 0/1/2-credit threshold at finalization. [S4, S5]
- Purchased packs contain **5, 15 or 50 credits**, sold separately without changing the subscription. They are a separate `user_credits` balance, not an increase to the plan’s included allowance. AI Coaching and Player Stories can use the purchased balance when included capacity is insufficient; Round Buddy’s access path does not. Do not promise that purchasing credits unlocks paid-only Player DNA, trends, practice plans, unlimited reports or a paid subscription. [S2, S4, S9]
- The API’s generic AI Coaching access check requires **two** remaining included credits to start a coaching session; actual completed-session charging is server-side and atomic. Player Story costs one credit in its claim transaction but shares this generic two-credit source selection, so edge cases with exactly one included credit need care; do not translate `access/ai_coaching.remaining` into a guaranteed count of creatable stories. [S4, S7, S9]
- Report allowances are **not PR Credits** and purchased PR Credits do not replenish free AI Round Reports. A free account’s report balance is stored per profile; older accounts initially received 12 under the earlier migration and are not reduced to 10 by the newer default change. Reuse the actual remaining counter for personalized copy rather than assuming every free player has 10. [S1, S6, S7]
- Deprecated client-side consume endpoints are no-ops; do not describe a credit as spent merely when the app opens a feature. Billing occurs through the relevant server-side session, hole or generation path. [S6, S7, S9]

## 4. Roles

- **Player** is a subscription plan, not an admin/creator role. Authenticated players access their own rounds and stories; subscription access follows the plan and status above. [S4, S9]
- **Creator** access depends on an active `creator_profiles` record owned by the authenticated account; advanced creator capability is a separate database flag, not the Performance subscription. Players may grant an active creator permission to use a qualified story candidate **without creating a paid Player Story** (the Share – Free path). This is not a general grant of access to all player rounds. [S11]
- **Admin** requires `profiles.role = admin` checked on the server after authentication; having a paid plan or creator profile does not confer admin access. [S12]

## 5. Web Copy Facts

- Safe: “Free includes 10 lifetime PR Credits for eligible AI activities”; “Player includes 40 PR Credits per month”; “Performance includes 120 PR Credits per month.” Condition these on the current plan catalog/migration being deployed. [S1, S4]
- Safe: “AI Coaching uses 2 credits per completed session”; “Create a Player Story for 1 credit”; “Round Buddy is free for 1–3 holes, 1 credit for 4–9 holes, and 2 credits for 10–18 holes when finalized.” [S5, S7, S9]
- Safe: “New Free accounts receive 10 lifetime AI Round Reports; active Player and Performance subscribers have unlimited AI Round Reports.” For an existing player show the **actual remaining report balance**, not a reconstructed total. [S1, S6, S7]
- Safe: “Buy 5, 15 or 50 extra credits without changing your plan.” Show the fetched Stripe price and currency before checkout; avoid hardcoded prices, claiming purchased credits unlock subscriptions, or promising that all features consume the same number of credits. [S2, S3, S4]
- Do not advertise a trial duration, unlimited PR Credits on Performance, a separate Roast My Round entitlement, a purchased-credit Round Buddy fallback, or “all AI features unlocked by credit packs.” [S2, S4, S10]

## 6. Source References

- **S1** `artifacts/golf-coach/supabase/migrations/20260922_update_credit_entitlements.sql:16-35` (latest checked-in 10/40/120 and new-profile 10-report default); `artifacts/golf-coach/lib/upgradePlanFeatures.ts:19-41` (current plan copy); `supabase/migrations/020_subscription_plans.sql:43-56` (plan flags only; initial values superseded).
- **S2** `artifacts/api-server/src/lib/stripeService.ts:20-51,217-253,373-427` (products, price IDs, live Stripe lookup, subscription vs one-time purchase); `artifacts/api-server/src/routes/billing.ts:30-45,65-76` (public prices and checkout).
- **S3** `artifacts/golf-coach/hooks/useLivePricing.ts:1-32` (live fetch/fallback); `artifacts/golf-coach/lib/pricing.ts:31-78` (bundled display fallback and locale currency); `artifacts/golf-coach/app/upgrade.tsx:87-119,130-135,305-343` (plan/pack display).
- **S4** `artifacts/api-server/src/lib/entitlements.ts:getUserSubscription, getFeatureAccess` (lines 115-375, plan status, flags, lifetime/period limits, purchased fallback); `artifacts/golf-coach/lib/entitlements.ts:getFeatureAccess` (lines 186-351, client display check).
- **S5** `artifacts/api-server/src/lib/entitlements.ts:finalizeRoundBuddySession, reserveRoundBuddyHole` (lines 382-407, 684-743); `artifacts/golf-coach/supabase/migrations/20260922_update_credit_entitlements.sql:73-155` (final threshold accounting); `artifacts/api-server/src/routes/coaching.ts:1535-1547,1684-1725,1825-1840` (voice gate/reservation/commit).
- **S6** `supabase/migrations/050_report_entitlement.sql:28-42,74-111` (earlier default 12 and atomic report counter); `artifacts/api-server/src/routes/entitlements.ts:16-45,72-91` (report balance and deprecated endpoints).
- **S7** `artifacts/api-server/src/routes/coaching.ts:2388-2445,2568-2685,2883-2913` (verified coaching charge, reports and skip conditions); `supabase/migrations/074_coaching_completion_charge.sql:20-84` (2-credit completed coaching charge).
- **S8** `artifacts/api-server/src/routes/coaching.ts:73-215` (Voice Recap completion/evidence); `artifacts/golf-coach/supabase/migrations/20260922_update_credit_entitlements.sql:262-423` (Voice Recap plan/purchased paths).
- **S9** `artifacts/api-server/src/routes/playerStories.ts:74-190,198-239,254-295` (ownership, completed rounds, claim/retry); `supabase/migrations/068_player_story_nullable_candidate.sql:58-155` (atomic one-credit claim); `artifacts/api-server/src/routes/stories.ts:1368-1380` (candidate flow access).
- **S10** `artifacts/golf-coach/components/StoryVoiceSelector.tsx:29-60`; `artifacts/api-server/src/routes/playerStories.ts:88-98,176-190` (Roast My Round is a story voice style using the same claim).
- **S11** `artifacts/api-server/src/lib/creatorAuth.ts:116-195` (active owner and advanced capability); `artifacts/api-server/src/routes/stories.ts:309-353,404-423` (permission and free share).
- **S12** `artifacts/api-server/src/middleware/requireAdmin.ts:6-49` (server role gate).

## Needs Confirmation

- **Deployment state:** confirm the 20260922 migration is applied in the target environment and read its actual `subscription_plans` rows and report default before publishing numeric offers. The older root migration still seeds 12 reports/earlier plan limits; this document does not query live data. [S1, S6]
- **Report exhausted wording:** the current `/report` response says “all 12 free AI Round Reports” even though the newer migration makes **10** the default for new accounts (older accounts can retain 12). The counter, not this fixed error text, is the safe display source. [S1, S7]
- **Voice Recap purchased-credit cost:** the later migration increments included usage by 2 but its purchased branch subtracts 1; the app’s plan copy says 2. Confirm intended cost and deployment before stating a universal 2-credit Voice Recap price. [S1, S8]
- **Player Story with one included credit left:** its one-credit claim and generic two-credit AI Coaching precheck/source selection can disagree. Confirm the one-credit edge case before promising every last included credit is spendable on a story. [S4, S9]