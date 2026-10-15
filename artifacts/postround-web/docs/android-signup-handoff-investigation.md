# Android signup handoff: evidence and release boundary

**Task status: blocked, not complete.** The confirmation-only download fallback
is implemented, but the handoff fix cannot be completed without current Android
device/installed-handler evidence. Completion checking rejected the unverified
same-tab launch-context change; it was removed. Original app-link behavior remains.

## 1. Root cause and exact control flow

**The bare URL is deliberate; the underlying native launch failure remains unresolved.**
There was no launch click handler, lost route, normalization, intent, timer, or
session-transfer payload. Before this change, `SignupConfirmationView.tsx:80–88`
rendered `href={POST_ROUND_APP_URL}` with `target="_blank"`. The constant at
`src/lib/referrals/config.ts:4` is literally `golf-coach://`, without a host,
path, query or fragment. A bare scheme is not proven invalid merely because it
has no path. New-tab behavior is a verified web risk, not a proven OS failure cause.

All paths below are relative to `artifacts/postround-web/`:

| Stage | File / function / generated destination |
| --- | --- |
| Public creator entry | `src/app/creators/[slug]/page.tsx`, `CreatorPage`: passes `/r/${slug}` to the creator profile. This is site-relative, not an app link. |
| Referral request | `src/app/r/[slug]/route.ts`, `GET`: validates slug, uses `referralPlatform(User-Agent)`, calls `issue_creator_referral`, sets the first pending HttpOnly `pr_ref` cookie, then returns a no-store 302 to `new URL(referralDestination(platform, evidence), request.url)`. No production referral request was made during this investigation. |
| Destination construction | `src/lib/referrals/config.ts`, `referralDestination`: configured Android HTTPS `play.google.com/store/apps/details?id=…` plus `referrer=pr_ref%3D<opaque-event>`; configured iOS HTTPS `apps.apple.com/...`; otherwise safe site-relative `WEB_FALLBACK_PATH` or `/signup`. The event is not copied to the app-open or plain-download link. |
| Signup | `src/app/(auth)/signup/page.tsx`, `referralContext`, `handleSendCode`, `handleVerifyCode`, `confirmCredentials`, `finishVerified`: reads `/referrals/status`; password signup, signup OTP, verified identity and same-account password proof; referred users go to `/signup/complete`. Ordinary users claim pending evidence if needed and go to `/dashboard`, `/dashboard?referral=pending`, or `/signup/complete` when the claim reveals prior referral context. Tab-scoped context is not attribution proof. |
| Separate PKCE flow | `src/app/api/auth/callback/route.ts`, `GET`: exchanges the code, attempts the pending claim and redirects to configured `NEXT_PUBLIC_SITE_URL` or request origin plus the allowlisted `/reset-password`, `/delete-account`, or default `/dashboard`. Failure goes to `/login?error=invalid_link`. It constructs no custom-scheme URL. |
| Guarded confirmation | `src/app/(auth)/signup/complete/page.tsx`, `SignupCompletePage`: checks verified Auth user before JSX, else `/login`; `readReferralStatus` reads only own attribution. It supplies pending-cookie status and the confirmation-only download URL. |
| Confirmation recovery | `src/components/auth/SignupConfirmation.tsx`, `check`, mount effect and `retry`: existing `/referrals/claim` POST or `/referrals/status` GET, at most three explicit retries; 401 redirects to `/login`. App/download CTAs do not invoke these functions. |
| App launch | `src/components/auth/SignupConfirmationView.tsx`, `SignupConfirmationView`: unchanged direct user-clicked anchor, exactly `golf-coach://`, `_blank`, `noopener noreferrer` on every platform. No new destination is introduced. |
| Download and continuation | Same view: configured validated details listing, otherwise exactly `https://play.google.com/apps/internaltest/4701664780036715121`; explicit tester-access explanation; ordinary HTTPS download remains a new-tab link. `Continue on web` is always `/dashboard`. |

`next.config.ts` has no custom rewrites or scheme normalization. Middleware
refreshes web auth and guards web routes, not external scheme navigation.
No app-launch environment variable exists: the scheme is a literal constant.
`ANDROID_STORE_URL`, `IOS_STORE_URL`, and `WEB_FALLBACK_PATH` are server-only inputs.

## 2. Inspected and reproduced evidence

- Read the full investigation brief, confirmation components, config, referral
  entry/status/claim flow, signup and callback, deployment checklist, signup
  acceptance notes, unit assertions and Playwright configuration.
- Workspace search found no Android application manifest, generated APK,
  package declaration, app-link association, Android intent, or scheme helper.
  Fixture package/listing names are not independent evidence.
- Read-only GitHub inspection of `PostRoundCoach/postroundcoach`, branch `main`:
  `artifacts/golf-coach/app.json:8` declares `"scheme": "golf-coach"`;
  line 24 declares `"package": "com.postroundcoach.app"`; line 35 uses Expo Router.
  No explicit Android `intentFilters` or iOS associated domains are declared.
  The repository has no generated application Android manifest or `assetlinks.json`.
  Router layouts list auth/tabs and other screens, but establish no required
  signup-completion deep-link destination. Source main is not installed-build proof.
- Public read-only HTTP inspection: `https://postroundcoach.com/.well-known/assetlinks.json`
  returns 308 to `https://www.postroundcoach.com/.well-known/assetlinks.json`,
  which returns 404; the Replit production host returns 404 for that file too.
  This is not a verified App Links association. No DNS/domain settings were changed.
- User supplied the exact internal-testing URL as the fallback and identified
  the distribution channel. Public GET/HEAD returns 302 to Google sign-in;
  this confirms an access-gated endpoint, not tester eligibility or APK identity.
- Filtered environment inspection found none of `ANDROID_STORE_URL`,
  `IOS_STORE_URL`, or `WEB_FALLBACK_PATH` in the accessible Replit environment.
  External Vercel environment values were not inspected or changed.
- Existing automation cancels the custom-scheme click before the OS can run it,
  then records the exact href. This reproduces web wiring only.
  Android-UA coverage also deliberately cancels navigation and checks visible
  fallback/continuation and no CTA referral mutations. Canceling the click does
  not reproduce a blocked/absent-app OS result or establish fallback survival.

### Eight failure possibilities

| Possibility | Classification | Evidence / limit |
| --- | --- | --- |
| 1. Handler constructs a scheme without a valid destination | **Verified bare generation; destination validity unverified.** | Constant and anchor have no path; no handler constructs it. No product-defined in-app screen was supplied. Lack of path is not independently proven to cause failure. |
| 2. Browser blocks/ignores/custom-handles scheme | **Unverified.** | User reports failed handoff; browser/version/build evidence unavailable. `_blank` was present, but its causal role is not proven. |
| 3. Invalid/incomplete Android intent | **Ruled out for this web path.** | No `intent://` or intent construction. |
| 4. Destination lost in encoding/redirects | **Ruled out for this web path.** | Literal constant goes straight to `href`; no destination existed to strip. Referral 302 and PKCE callbacks are separate. |
| 5. Scheme alone assumed to guarantee launch | **Ruled out as an explicit guarantee; no OS success detection exists.** | Existing copy warned the app may not open; direct anchor has no handler result or success check. |
| 6. Silent failure/no valid fallback | **Verified fallback limitation, OS silence unverified.** | Prior scheme link opened a separate context; unset/invalid details config disabled download. Continue-on-web and warning already existed, so fallback was not completely absent. Supplied internal-test URL was rejected by the old download validator. |
| 7. Browser session expected to transfer | **Ruled out in this implementation.** | No tokens, session, credentials or referral in app URL; copy explicitly requires native sign-in. |
| 8. App launches but wrong screen opens | **Unverified.** | No device run or required in-app destination; source routes alone do not prove current OS launch/routing. |

## 3. Options and changes made

**A — Preserve the existing scheme: no evidence-backed launch fix established.**
Source declarations and historical manual verification support retaining exactly
`golf-coach://`, not inventing a route or `golf-coach:///` variant. The proposed
same-tab change was removed: if a browser navigates away on failure, fallback
controls could disappear. Neither same-tab nor existing new-tab behavior is a
verified Android failure-path solution. Explicit fallback choices are visible
before clicking; their survival after actual OS handling remains unverified.

**B — Package-targeted Android intent plus encoded HTTPS fallback: deferred.**
Source package identity exists, but actual installed manifest/action/category/data
matching and bare-scheme acceptance are not established. An internal-test HTTPS
fallback is now supplied, but that alone does not validate an intent data URI.
Before constructing one, inspect the distributed manifest and verify the exact
accepted URI in Android Chrome. Preserve its bytes; correctly encode the
browser fallback only after the accepted intent shape is established. No intent
string or unverified path was added.

**C — HTTPS App Links: not currently supported by inspected evidence.**
Requires the installed app's VIEW/DEFAULT/BROWSABLE HTTPS intent filter with
`autoVerify`, approved host/path mapping, and a no-redirect HTTPS
`/.well-known/assetlinks.json` associating the verified application ID and actual
Play signing-certificate SHA-256 fingerprints via
`delegate_permission/common.handle_all_urls`. Domain verification on the
distributed build is also required. No native release or association change
is justified or authorized here.

Files changed:

- `src/lib/referrals/config.ts`: supplied internal-test constant and confirmation-only
  fallback helper; historical-proof comment clarified. `androidStoreUrl` and
  `referralDestination` behavior are unchanged.
- `src/app/(auth)/signup/complete/page.tsx`: uses that helper after the existing
  page guard.
- `src/components/auth/SignupConfirmationView.tsx`: explanatory
  manual-open/download/web options and internal-testing access requirements.
  Every platform's original app launch target is unchanged.
- `src/lib/referrals/confirmation.test.ts`: missing/invalid config, internal-test
  fallback isolation, exact URI and no-payload/source guards.
- `e2e/signup-confirmation.spec.ts`: supplied download fallback, Android
  canceled-click presentation/continuation, no CTA mutations, and iPhone target
  regression; not a native blocked-launch test.
- `PRODUCTION_ENV_CHECKLIST.md`, `supabase/creator-referrals.md`: document
  confirmation-only fallback vs unchanged install routing.
- `docs/android-signup-handoff-investigation.md`: this evidence/release report.
- Repository-root `.agents/memory/MEMORY.md` and
  `.agents/memory/creator-signup-handoff.md`: corrected historical-proof limits
  and user-supplied distribution facts.

`next-env.d.ts` was restored to its original `.next/types/routes.d.ts` reference
after generated test-build changes. It is **not** a final changed file.
`src/components/auth/SignupConfirmation.tsx` was also restored and is not changed.
The supplied investigation attachment was already present and was not edited.

**Configuration answer:** `ANDROID_STORE_URL` still does **not** accept
`/apps/internaltest/...` for referral/install routing, deliberately. Confirmation
now uses the owner's exact supplied link when that setting is missing/invalid
(including if it contains the supplied internal-test URL). This requires no
environment change. Never append `pr_ref` to the internal-test link or assume
it implements the details listing's Install Referrer contract.

## 4. Test commands and results

Typecheck/unit results are against the final narrowed working tree. Browser
results below precede removal of the rejected launch-context change and must
not be represented as final-working-tree browser verification. No production-account tests.

- `pnpm --filter @workspace/postround-web typecheck`: passed.
- `pnpm --filter @workspace/postround-web test`: 135 tests, 134 passed, 1 failed.
  The same unrelated baseline failure existed before edits: `favorite amendment
  is function-only and guards both web success paths` in
  `src/lib/referrals/referrals.test.ts:15`. Its migration input,
  `supabase/migrations/202610070001_web_referral_favorite.sql`, contains two spaces.
  No SQL or test weakening was performed; release cannot be described as all green.
- `PLAYWRIGHT_CHROMIUM_PATH=/repl/tools/bin/chromium pnpm exec sh
  artifacts/postround-web/e2e/run-tests.sh signup-confirmation.spec.ts`:
  completed its isolated production build, but the workspace restarted during
  browser execution; there is no completed result from that interrupted run.
  An earlier baseline run was stopped when the user supplied the fallback.
- `E2E_USE_EXISTING_BUILD=1 PLAYWRIGHT_CHROMIUM_PATH=/repl/tools/bin/chromium
  pnpm exec sh artifacts/postround-web/e2e/run-tests.sh signup-confirmation.spec.ts`:
  most recent full run **11 passed, 1 failed (57.8s)**. The new Android fixture
  passed its Android assertions but tried to change to an iPhone User-Agent
  within the Android context; the request still rendered the Android target.
  The previous recovery run also had 11 passed/1 failed because the new fixture
  navigated before ordinary signup's existing dashboard redirect settled.
  Both were fixture defects, corrected only in the handoff test.
- `E2E_USE_EXISTING_BUILD=1 PLAYWRIGHT_CHROMIUM_PATH=/repl/tools/bin/chromium
  pnpm exec sh artifacts/postround-web/e2e/run-tests.sh signup-confirmation.spec.ts
  --grep 'Android confirmation avoids'`: **1 passed (14.8s)** before narrowing,
  after waiting for
  the existing signup destination and using a separate iPhone browser context
  with the offline session cookies. The screenshot confirms the Android fallback
  and web-continuation controls are visible. No remaining known confirmation-test
  failure: the 11 unchanged scenarios passed the full run and the corrected
  scenario passed the focused rerun. This is not a claim of a fresh 12/12 full
  run or browser verification of the final narrowed implementation. The current
  test is named `Android confirmation exposes the internal-testing fallback
  without CTA mutations` and expects the original `_blank` target.
- The isolated build was reused only after verifying its completed `BUILD_ID`
  and that no application source/package/Next config was newer. No app code
  changed in the fixture corrections. Typecheck was rerun after generated paths
  were restored and again after the final test edit: passed.
- `git diff --check`: passed.
- No web lint script or ESLint/Biome configuration/dependency exists. No lint
  result is claimed; typecheck and tests are the available code checks.
- The configured web preview was restarted once after the code batch; workflow
  startup logs show its proxy listening on port 18644. A public `/signup` preview
  screenshot renders the form; its capture surfaced an input hydration warning
  on the unmodified signup page, not a tested handoff failure. The authenticated
  confirmation was visually checked via the successful offline test screenshot.

## 5. Real-device status

No Android device/ADB is available in this workspace. Android-UA Chromium is not
Android Chrome, and canceled navigation is not an installed/uninstalled app test.
No tester enrolled, native account signed in, APK rebuilt, or AAB requested here.
Historical scheme-only verification is not a substitute for current device proof.

## 6. Launch, routing, authentication and session findings

- **Launch:** current device failure is user-reported and remains unresolved;
  original scheme/new-tab launch behavior is unchanged. The download fallback
  improvement does not resolve or prove the native failure path.
- **Routing:** no dedicated in-app completion destination is defined in this
  web flow. Bare-scheme root acceptance and displayed screen need device evidence.
- **Authentication:** user reports successful manual same-account native login,
  working signup and creator attribution. These are accepted as reported, not
  re-tested through production mutations. Existing native login persistence after
  a browser launch has not been observed here.
- **Session transfer:** none. Same email/password sign-in is independent of app
  navigation. No automatic native authentication is promised or implemented.

## 7. Deployment status and target

Changes are task-branch/local preview only; **no production publication or
configuration changes were performed**. Preview artifact owns `/` on port 18644.
Offline browser tests use `http://localhost:3100`, fake Supabase/API on
`http://127.0.0.1:54321`, and `.next-e2e`, not the preview build or production data.
The environment disables inherited real store config for the default fixture.

Deployment metadata reports an active successful Replit production build at
`https://postroundcoach-web.replit.app`. Separately, public HTTP confirms
`https://www.postroundcoach.com/` serves through Vercel, with apex redirecting
to `www`. The production handoff target for an approved release is the existing
canonical web site's deployment, not the API/native app. Exact Vercel project,
production branch and source-release identity were not verified here and must
be confirmed by the deployment owner before approval. No setting is changed
merely because both sites respond.

## 8. Remaining requirements

1. On the currently distributed internal-testing build, record non-sensitive app
   version/build, Android and Chrome versions, actual scheme handler/manifest
   match, and observed screen. Compare the existing user-clicked bare URI in
   current vs new-tab context; do not infer cause from source alone.
2. Test the confirmation in Android Chrome with app installed and launch blocked/
   unavailable, using the unchanged account only non-destructively if login is
   needed. Confirm no scheme-only tab, accessible web continuation, return/back
   behavior and tester-account access to the supplied download link.
3. If Android intent is still needed, establish the installed package and
   accepted data URI before proposing the smallest web intent change. No native
   build change is presumed necessary.
4. The existing unrelated whitespace migration/test failure is recorded only;
   it was not reopened, restored, or altered as part of the handoff work.
5. Confirm release ownership and request production approval only after reporting
   these results. No DNS/Cloudflare/Supabase/API/environment change is currently
   demonstrated necessary. App Links would require separately approved work.
