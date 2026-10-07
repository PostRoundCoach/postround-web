# Creator referrals: web foundation and mobile handoff

## Boundaries

The user has manually verified that the installed Android APK opens with
`golf-coach://`. The web confirmation uses that exact scheme for user-clicked
navigation only; it adds no path or credentials and does not transfer a web
session. This does not verify native authentication or Install Referrer capture.

## Signup confirmation

Creator-referred email-code signup preserves pending-browser context before
claiming and goes to `/signup/complete`. Ordinary signup and password login keep
their existing destinations. The confirmation page verifies authentication
before constructing account-ready content. Signed-out/expired sessions return to
login; authenticated direct access works even without referral evidence.

The page reads the signed-in user's immutable `creator_attributions` row using
the authenticated client and own-user RLS. Only this durable read displays
“applied”; neither query parameters, cookies, nor HTTP claim success do.
An existing attribution stays authoritative despite a later creator click.
Pending valid-looking evidence gets one initial claim attempt; transient failures
retain the cookie and offer at most three explicit retries per visit.
Malformed/expired/consumed evidence is terminal and cleared. A failed attribution
read is not proof of absence and is retryable without claiming blindly.
Refresh/revisit reads persisted attribution even after the cookie is cleared.
All referral status/claim responses are private, uncached responses.

Open Post Round is a user-clicked `golf-coach://` anchor in a separate browsing
context; no installed-app detection, auto-opening, attribution mutation or
session transfer occurs. The page remains available if opening fails. Users may
need to sign in in the app with the same account; no native sign-in method is
promised. Continue on web always goes to `/dashboard`.

Download Post Round is disabled with “Google Play listing coming soon” while
`ANDROID_STORE_URL` is unset/invalid. A verified HTTPS Play details URL configured
centrally enables the plain download link without referral evidence. No listing
is derived from a package ID. `/r` still chooses the Android store *before*
signup when configured and still adds the same Install Referrer `pr_ref` payload.
An unset listing falls back to web signup as before.

This repository contains the Next.js site, shared API, and Supabase migration files, **not the mobile application**. Expo SDK, React Native version, router, EAS build configuration, Android package name, iOS bundle ID, app scheme, native Install Referrer module, and universal/app link configuration cannot be verified here. No Android or iOS install attribution is live. The current web account creation is Supabase email OTP (`signup/page.tsx`, `verifyOtp`); the login page uses password auth, and the auth callback exchanges PKCE codes. The API owns account deletion; existing subscriptions remain on `profiles` and are not changed by this feature.

`creator_profiles.id` is the canonical creator key, **not** `creator_profiles.user_id` (the optional owner). `profiles.id` is the referred user's authenticated ID. Original attribution remains immutable and independent of subscription/compensation. After the function-only web favorite amendment is applied, successful web completion defaults a NULL `profiles.favorite_creator_id` to the persisted original attribution's creator; any non-NULL favorite wins and remains independently changeable by the player. This is not a backfill or a native referral repair mechanism.

## Contract

* Public `GET /r/{slug}` accepts only a valid active `creator_profiles.slug`. It calls `issue_creator_referral(slug, platform)` and returns a 302. An inactive, malformed, or unknown slug returns 404. A DB failure returns 503 rather than silently skipping click capture.
* The RPC creates or reuses a stable `creator_referral_links.id` for that creator and inserts a `creator_referral_events` click. It returns a random UUID event ID (128-bit opaque evidence), expiring after 30 days. The link ID survives display-name changes; after a link is issued, its public slug cannot be renamed while the creator is active. Click events are **not** proof of an install or a user attribution.
* Browser fallback is `/signup`. An HttpOnly, SameSite=Lax, 30-day cookie holds the **first** pending event ID through the same-browser OTP/login flow. The client POSTs `/referrals/claim` after authentication; a PKCE callback also attempts the claim. A transient claim failure retains the cookie for retry. The claim endpoint uses the authenticated Supabase session, never a client-supplied creator or user ID.
* With pending web evidence and an existing own-user attribution, the handler replays that row's stored `referral_event_id` through the same authenticated RPC (even if the later pending cookie is malformed). No pending cookie means no claim or favorite remediation. Signup confirmation also processes pending evidence when its attribution read already says `applied`; ordinary status reads stay read-only. Only successful/terminal outcomes clear the cookie. See [web favorite amendment](web-referral-favorite.md) for transaction, test and release details.
* Authenticated native clients may call Supabase RPC `claim_creator_referral(evidence_id uuid, claim_method text)` with the authenticated user's access token. Methods: `web_referral` (web fallback, including mobile browsers) or `android_install_referrer` (requires an Android click event). The RPC returns `{creator_id, attributed_at}[]`: one established row or an empty array if evidence was already consumed by another account. It raises SQLSTATE `22023` for bad/expired evidence or wrong method and `28000` without auth. Retries with the same valid evidence return the user's existing attribution. Concurrent claims for one user serialize on the unique `user_id`; later valid clicks cannot replace the original. A unique event FK prevents reuse across users. Invalid evidence cannot be used to discover an existing attribution.
* Direct table INSERT/UPDATE/DELETE is unavailable to anon/authenticated; RLS limits authenticated SELECT to one's own attribution. An immutability trigger blocks changes even through privileged direct DML except the service-only account-erasure path. Account deletion erases the referred user's record and detaches/anonymizes referred creator identities before deleting their owner account, without retaining personal data in referral rows.

## Destinations and setup

Set server-side `ANDROID_STORE_URL` to an HTTPS `play.google.com/store/apps/details?id=<actual-package>` URL; the route inserts `referrer=pr_ref%3D<event-uuid>` (Google Play Install Referrer query payload). Set `IOS_STORE_URL` to an HTTPS `apps.apple.com/...` listing when known. `WEB_FALLBACK_PATH` defaults to `/signup` and must be a site-relative path; external/unsafe fallbacks are ignored. Invalid or absent store configuration falls back to the web signup path while retaining the cookie. These variables are server-only, not public client variables. Set them in the deployment environment after store listing verification; do not infer them from a development domain. No creator-specific URL setting is needed.

Android handoff (future mobile repository): verify the actual Expo/React Native versions, package ID, navigation and EAS/native-module setup; add Google's Play Install Referrer API in a supported native build, parse **only** `pr_ref` as a UUID from the decoded referrer payload, persist it locally until Supabase login/signup succeeds, then call `claim_creator_referral(uuid, 'android_install_referrer')` with the user's session. Retry transient failures, discard rejected/expired evidence, and do not generate a new click locally. Keep the same `/r/{slug}` creator URLs and database contract. Test on an actual Play-distributed build; local sideloads do not establish Install Referrer behavior.

iOS does not offer an equivalent deterministic App Store install-to-user referrer. App Store campaign parameters can measure campaigns in App Store Connect, and Universal Links/deep links can carry evidence **when an already-installed app actually opens the link**. They do not guarantee matching a prior web click after a new install. Do not label an iOS campaign report as verified user attribution or claim using a slug alone. A future iOS handoff needs the verified bundle ID, App Store listing, associated domains/universal links, navigation handling, and a product-approved approach to voluntary/manual attribution if cross-install matching is desired.

Evidence is bearer-style and can be shared or self-generated through the anonymous click RPC. Neither the web cookie nor a self-reported Play referrer proves a genuine install or unique human. Before any creator compensation, add abuse controls and independently validate install and purchase eligibility. Click volume is telemetry, never the payment ledger.

## Migration and verification

Review `migrations/202609250001_creator_referrals.sql` for three new tables, FKs, uniqueness, locks, RLS and the account-erasure amendment. There is no bulk backfill and no hard-coded creator rows; the first active-creator click lazily creates its link. Rollback requires a separate reviewed migration; do **not** drop attribution records as an ad-hoc recovery. On a non-production clone reconciled to the dated baseline, run `supabase migration list`, `supabase db push --dry-run`, apply and exercise both real creator fixtures, bad/inactive slugs, expiry, concurrent claims, direct authenticated DML denial, and account deletion. Only after review should a collaborator link the correct production project, compare the migration ledger, run `supabase db push`, and verify the new ledger entry with `supabase migration list`. The checked-in SQL alone does **not** prove production installation.

Web route tests use a local fake Supabase service; they do not assert database RLS. Native install-to-signup and store behavior remain unverified until the mobile repository, identifiers, destination URLs, and distribution builds exist.

Shared web signup now establishes a user-chosen password with Supabase password signup before email
confirmation. Only verified matching identity and successful same-user password authentication can
complete this funnel. Pending referral evidence remains in its HttpOnly cookie; a tab-scoped referral
UI hint preserves the referred completion destination during refresh but never proves attribution.
Signup confirmation/resend use `type: 'signup'`; no referral schema or claim contract changed.
See [password signup acceptance and release gates](password-signup-acceptance.md) for the unchanged
configuration prerequisite, real-email and Android same-account checklist, and unverified release evidence.