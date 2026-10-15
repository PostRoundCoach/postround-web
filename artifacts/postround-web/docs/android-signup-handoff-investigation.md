# Production fallback restoration — 2026-10-15

This section supersedes the earlier fallback implementation and test status below.
It records a web-only investigation/correction, not distributed-build or device proof.

## Evidence and confidence

- **Owner device observations (provided, not repeated here):** Open Post Round
  launches an installed app; without it, Android Chrome opens a stalled
  `golf-coach://` tab. The observed confirmation lacked the internal-test
  alternative/instructions.
- **Non-mutating serving-release inspection:** `GET /signup` on
  `https://www.postroundcoach.com` returned 200, `Server: Vercel`, matched
  `/signup`, and a signup script URL with
  `dpl=dpl_DUt1Am7ZMMKazjuRK8sERZy6B2QH`.
  The authenticated Vercel read
  `GET /v13/deployments/www.postroundcoach.com` identified that same READY
  production deployment, canonical aliases including `www.postroundcoach.com`,
  repository `PostRoundCoach/postround-web`, branch `main`, and commit
  `9305b12877a9d43ce1e3ede5e567a33376430e3a`.
  Replit's deployment lookup separately identified
  `https://postroundcoach-web.replit.app`; that is not proof about the canonical
  Vercel site's content.
- **Serving-source comparison:** read-only GitHub contents requests at the
  Vercel-reported commit and current remote `main` returned identical blob IDs
  for referral entry, signup, complete page, confirmation client/view, and
  referral config. The deployed-commit view already contains the internal-test
  conditional; the page already calls `androidConfirmationStoreUrl()`.
  This rules out “the earlier fallback code was never deployed” for the release
  identified during this inspection. It does not prove a particular user's
  browser received that release at the earlier observation time.
- **Guarded production HTML:** signed-out `GET /signup/complete` resolved to
  `/login` (200 after redirect), without confirmation text. No authorized
  confirmed-player browser session was used, and no production environment
  values were read. Thus signed-in rendered props and effective runtime
  `ANDROID_STORE_URL` validity remain unverified.
- **Confirmed source defect, conditional production cause:** a valid configured
  Play details URL takes precedence in `androidConfirmationStoreUrl()`. The
  old view then hides the internal-test guidance because it requires exact
  equality with the fallback constant, and its sole download points to the
  configured listing. That deterministically explains both missing items
  *if* the serving runtime has valid listing configuration. The code defect
  is confirmed in serving-commit source; runtime configuration as the cause
  of the owner's particular observation is not claimed proven. Remaining
  evidence: an authorized existing confirmed-player session's rendered
  confirmation (hrefs/instructions only, no tokens), plus owner confirmation
  of the effective deployment's store-config validity without exposing values.

No live `/r/prcoachtest` request was made: that GET invokes
`issue_creator_referral` and would create install/referral evidence. No signup,
claim, deletion, attribution, account, database, environment, DNS, or release
mutation was performed. Only offline fixtures submit signup and claims.

## Actual route and smallest correction

Source trace (same relevant files on remote main and serving commit):
`/r/prcoachtest` → `src/app/r/[slug]/route.ts` issues opaque evidence and
sets the pending cookie → configured platform destination (web fallback
`/signup`; Android can intentionally go to a configured Play listing first).
Web password signup → signup email OTP confirmation → same-account password
check → referred `finishVerified` pushes `/signup/complete`.
That route is guarded by confirmed-user `getUser()` before constructing
`SignupCompletePage` → `SignupConfirmation` → `SignupConfirmationView`.
The page reads authoritative referral status; the existing client claim
lifecycle is unchanged. There is no alternate unused confirmation component.
The referral handler and signup transition were traced in source, not exercised
against production.

Only the view's handoff UI changes: always render a separate **Join Google Play
internal test** action to exactly
`https://play.google.com/apps/internaltest/4701664780036715121`,
with eligible/invited Google-account, join-before-install, install-before-open,
and no-access web guidance. A distinct valid configured details download
remains available; omit a duplicate download when it equals the internal-test
link. Availability requires neither scheme success nor install detection.
Creator attribution messages, `golf-coach://`, `_blank`, safe external-link
attributes and `/dashboard` continuation are preserved. Config helper, referral
routing, auth, API, native code, and SQL are not changed.

Changed files:
- `src/components/auth/SignupConfirmationView.tsx`
- `src/lib/referrals/confirmation.test.ts` (clarify preserved configured behavior)
- `e2e/signup-confirmation.spec.ts` (real fixture referral→signup→confirmation,
  desktop/mobile visible fallback and exact links, guidance, CTA no-mutation checks)
- `e2e/start-app.sh` (unset absent fixture store config rather than inheriting it)
- `PRODUCTION_ENV_CHECKLIST.md`
- `docs/android-signup-handoff-investigation.md`
- `.agents/memory/creator-signup-handoff.md` (correct latest user-reported behavior)

## Verification and release handoff

Final verification results (repository-root commands):

1. Before edits, and again after edits:
   `pnpm --filter @workspace/postround-web exec node --experimental-strip-types --test src/lib/referrals/confirmation.test.ts src/lib/referrals/referrals.test.ts`
   → **6 passed, 1 failed**, identically before/after. All **4 confirmation
   unit tests passed**; **2/3 related referral tests passed**. Pre-existing
   failure: `favorite amendment is function-only and guards both web success
   paths`, `referrals.test.ts:15`, expects
   `CREATE OR REPLACE FUNCTION public.claim_creator_referral`, but its input
   migration `supabase/migrations/202610070001_web_referral_favorite.sql`
   contains only two spaces. No migration or unrelated assertion was edited.
2. Fresh isolated production build and complete confirmation suite:
   `PLAYWRIGHT_CHROMIUM_PATH=/repl/tools/bin/chromium pnpm exec sh artifacts/postround-web/e2e/run-tests.sh signup-confirmation.spec.ts`
   → build completed; **11 passed, 1 failed** on the first run. The first
   desktop test timed out waiting for the Create account button's click
   actionability (before confirmation), not on a fallback assertion. No
   product/auth workaround, forced click, timeout relaxation, or retry setting
   was added. This browser timeout is observed, not asserted to be a proven
   pre-existing product defect.
3. Complete suite rerun on that same freshly completed isolated build, with
   actual absent store configuration (the fixture startup explicitly unsets
   it), no application-source changes:
   ```sh
   export PLAYWRIGHT_CHROMIUM_PATH=/repl/tools/bin/chromium
   export E2E_USE_EXISTING_BUILD=1
   unset E2E_ANDROID_STORE_URL
   pnpm exec sh artifacts/postround-web/e2e/run-tests.sh signup-confirmation.spec.ts
   ```
   → **12 passed**, 36.2 seconds.
4. Invalid and valid configuration journey/routing matrix on the same isolated
   build, keeping the preceding exports:
   ```sh
   E2E_ANDROID_STORE_URL='invalid' pnpm exec sh artifacts/postround-web/e2e/run-tests.sh signup-confirmation.spec.ts --grep 'creator password signup|mobile referral signup|Android routing'
   E2E_ANDROID_STORE_URL='https://play.google.com/store/apps/details?id=test.fixture' pnpm exec sh artifacts/postround-web/e2e/run-tests.sh signup-confirmation.spec.ts --grep 'creator password signup|mobile referral signup|Android routing'
   ```
   → **3 passed** (13.2 seconds) invalid; **3 passed** (11.9 seconds) valid.
   Both desktop and Android-presentation referral signup journeys assert the
   exact always-visible internal-test action/instructions. Configured download
   retention and unchanged store-first opaque evidence routing are checked.
   Metrics equality around canceled CTA clicks verifies no added claim,
   attribution, profile write or evidence issuance.
5. `pnpm --filter @workspace/postround-web typecheck` → **passed** (exit 0).
   `git diff --check` → **passed**. No full unrelated web unit suite was run;
   the historical results below are not current-run results.

The existing runner restored tracked Next-generated TypeScript configuration;
the test build used `.next-e2e`, not the managed preview build. Generated
screenshots/traces remain in ignored `test-results`. The final valid-config
mobile screenshot was visually inspected and shows both the internal-test
action/guidance and configured download, with Continue on web below. The
absent-config mobile screenshot was also inspected. The managed web workflow
was restarted once after edits, reached ready and served `/` and `/login` with
200; the signed-out `/signup/complete` preview correctly redirected to login.

Fixtures prove web
wiring only: scheme and external-store clicks are canceled before navigation,
not evidence of native launch, installation, Play access, or scheme failure.
Mobile coverage enters the web referral branch using a desktop-UA entry
request and then continues with Android UA/viewport; the separate unchanged
Android store-first test verifies its configured redirect/evidence contract.

**Deployment status: not deployed or promoted by this task.** This task branch
must first be merged and any production release separately explicitly approved;
an automatic task completion/merge is not approval to release.

**Exact post-approval manual Android Chrome test:** using an owner-authorized
account/journey (any new account creation or signup submission needs separate
approval), start at `https://www.postroundcoach.com/r/prcoachtest`, follow the
canonical web referral signup/email-confirmation journey to `/signup/complete`,
and verify the creator attribution copy plus the exact internal-test action
and join/eligible-account/install guidance are visible *before* tapping Open
Post Round, including when a valid details listing is configured. With the
current distributed app installed, confirm the unchanged `golf-coach://`
new-tab action launches it. Without the app, the known stalled scheme tab may
remain: return to the original confirmation and verify the exact internal-test
action and Continue on web remain usable. Follow the test link with an eligible
or invited Google account, confirm joining/installing is understandable and
works, and confirm lack of eligibility clearly directs to `/dashboard` via
Continue on web. Record browser/build versions and result separately from
fixtures. No real-device or authenticated production confirmation verification
has been performed here.

---

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
