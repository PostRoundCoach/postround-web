# Business operator and public policy review

## Initial findings — October 29, 2026 (before implementation)

Read-only GETs to `https://www.postroundcoach.com/`, `/privacy`, `/terms`,
`/support`, and `/delete-account` each returned HTTP 200 without sign-in.
Their rendered server HTML did not contain “PR Coaching Software”. All five
included the four canonical footer links. Titles retained Post Round branding.
Source inspection found a shared footer, no About page, and product-only metadata.
The homepage already provides substantive product information.

Privacy and terms already discuss account/round data, optional voice and AI,
sharing, purchases, providers and retention. They omit operator identity and
describe deletion more generally than the current web contract. The deletion
client explains important limits only after authentication; the server page can
explain them publicly without changing authentication or the request contract.
Support exposes the existing mailto address; inbox delivery was not tested.
No production deletion, account mutation, database or environment change was made.

## Official references checked

- [Program enrollment](https://developer.apple.com/help/account/membership/program-enrollment):
  requires a public, functional, substantive website with an organization-associated
  domain. Legal-entity verification is separate; displaying the supplied business
  name does not establish incorporation, binding authority or Apple acceptance.
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/),
  especially 5.1.1: privacy disclosure must describe collection, use, third-party
  access, retention/deletion and consent choices accurately. A website audit alone
  cannot verify native permission prompts, SDKs, store disclosures or practices.
  The guideline also requires equivalent protection by recipients; the existing
  generic provider paragraph is not proof of that protection. Owner/legal must
  validate provider safeguards and explicit permission for third-party AI sharing
  (5.1.2), rather than adding an unsupported assurance to the public policy.
- [Account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/):
  apps supporting account creation must offer in-app initiation, direct web links
  where needed, understandable confirmation, retention/timing and billing
  information. A public web route is not proof of in-app discoverability or
  complete deletion. Ordinary deletion must not become a mandatory support flow;
  support here is for access problems, privacy questions and uncertain outcomes.

## Evidence and policy decisions

| Area | Evidence available | Supported revision / preserved text | Unresolved owner/legal confirmation |
| --- | --- | --- | --- |
| Operator | Owner-supplied brief identifies PR Coaching Software as developer/operator | Exact attribution in shared footer and policy/support/deletion introductions; product titles/tagline retained | Legal entity/enrollment identity and domain association remain owner's responsibility; no legal status/address invented |
| Account and support collection | Web signup/login, Supabase client/server auth, dashboard profile and support mailto | Preserve privacy §1; define “we” as operator | Confirm support inbox operation, authentication providers across native releases |
| Golf data and sources/use | Web round/scorecard readers; creator Story API client; homepage product description | Preserve privacy §2, §4, §8 and terms service description | Native shot/voice capture, Player DNA and AI generation are not implemented by this marketing web app; verify native collection and actual processing against released app |
| Voice/AI processing | Existing product description and policy; web creator content reads, not native capture or inference | Preserve conditional voice/AI provisions, do not add provider names or storage/training claims | Inventory current voice/transcription/AI SDKs and providers, data sent, storage, training use, transfers and permission prompts |
| Creator sharing/consent | Creator client permission state includes grants/revocation; separate player approval lifecycle contract | Preserve optional approval and published-copy limit; add support route to request withdrawal without promising a native toggle or removal of published copies | Confirm released player review/withdrawal controls, granularity of transcript sharing, handling of already published content |
| Technical/operational | Web server/client infrastructure and documented VAD read boundary | Preserve conditional diagnostics/security/use language (§7–8) | Native SDK/analytics inventory and exact event categories; do not infer absence from this repo |
| Providers/sharing | Web imports/configuration establish Supabase for auth/data; App Store references are conditional existing policy | Preserve generic provider purposes and existing conditional Apple statement (§9) | Full web/native processor inventory and legal disclosure adequacy; platform checkout/third-party contractual terms not verified |
| Billing/credits | Web billing displays stored state; no web checkout/credit consumption; deletion contract explicitly excludes billing cancellation | Preserve purchase-time terms and existing credit provisions; qualify Apple-specific instructions and direct other subscriptions to provider | Verify actual live stores, credit expiry/transfer/refund rules and legal adequacy; no new pricing/refund promises |
| Retention/security | Existing general policy; deletion contract explicitly lists retained/unverified stores | Preserve general retention/security (§10); make deletion limits explicit | Exact retention purposes/periods, backup/media/provider erasure, legal exceptions and processing timeline are unverified; no invented deadlines |
| Deletion | `docs/account-deletion-contract.md`, current client, outcome/confirmation tests; supplied October 15 evidence referenced by contract | Public sign-in/exact DELETE/acknowledgment instructions, irreversibility, cleanup intent vs all-store limits, separate cancellation and no retry after ambiguous outcome | Separate production API release, hosted dependencies, in-app entry point, Sign in with Apple revocation if applicable, all-store erasure and operational completion remain unverified |
| Other legal terms | Existing terms, not independently established business/legal facts | Preserve liability, IP, children’s privacy, termination and other substantive provisions; only identify operator and align deletion wording | Counsel must confirm age scope, rights, liability/content license, jurisdiction obligations and existing credit terms; preserved does not mean certified |
| Support | Existing canonical `/support` and `support@postroundcoach.com` | Preserve contact and safety guidance, add operator identity, align deletion limits | Inbox ownership/delivery and native restore-purchase availability; no response-time promise |

## Release boundary

This is implementation in an isolated task branch. Initial production GETs are a
baseline, not verification of the new copy. No publication is authorized. Local
validation, merge status and deployed verification must be reported separately.
Production acceptance remains pending an owner-approved release and read-only
checks of all five canonical pages on desktop/mobile. Never retry or perform a
destructive deletion to establish website compliance.

## Changed pages and files

- `src/components/Footer.tsx`: visible attribution on every shared-footer page.
  The homepage inherits this change; its marketing copy, navigation, imagery and
  calls to action are untouched. `src/app/page.tsx` clips offscreen horizontal
  animation overflow on main (see validation findings below); no layout redesign.
  No About page or duplicate route was added.
- `src/app/layout.tsx`: root description and Open Graph description only.
- `src/app/{privacy,terms,support,delete-account}/page.tsx`: identity,
  descriptions and evidence-based deletion/consent clarification.
- `src/app/legal-pages-source.test.ts`: identity/public-copy assertions and
  updated revision date; corrected an outdated sign-out assertion to match the
  already-existing local-scope sign-out, not a change to sign-out behavior.
- `e2e/public-business-identity.spec.ts`: anonymous desktop/mobile navigation,
  metadata, visible attribution, no-JavaScript instructions and overflow checks.
- `docs/business-operator-review.md`: evidence, exact wording and release handoff.

No changes to `DeleteAccountClient`, request/response handling, middleware, API,
authentication, billing, database, environment, or Supabase configuration.
No structured organization data added: visible attribution and existing metadata
adequately express the verified relationship without inventing legal details.

## Exact revised public wording

All other policy provisions are preserved, not certified as legally sufficient.
The owner was asked for provider/consent/retention/billing confirmation and supplied
no additional information; those questions remain open.

### Footer and revision dates

> Post Round is developed and operated by PR Coaching Software.

Privacy and terms: **Last Updated: October 29, 2026**.

### Privacy introduction and section 11

> Post Round is developed and operated by PR Coaching Software. In this policy,
> “we”, “us”, and “our” refer to PR Coaching Software, and “Post Round” refers to
> the app, website, and related services.

> You can choose what round context to provide and whether to use optional voice
> or creator-sharing features. To request withdrawal of consent for optional
> processing or creator sharing, or to ask about information already shared,
> contact support@postroundcoach.com. Content a creator has already used or
> published may remain outside Post Round’s control.

> You may request permanent account deletion through our Delete Account page.
> Sign in, review the warnings, acknowledge that deletion is permanent, and type
> the exact word DELETE before submitting. The process is intended to remove
> your account identity and the profile, round, scorecard, and related coaching
> data covered by application cleanup; it does not confirm erasure from every store.

> Security/audit history, separate waitlist marketing records, and detached
> creator referral records may remain. Removal of external provider records,
> uploaded media, logs, backups, and published copies is not confirmed by this
> process. Contact us with questions about retained information or a deletion
> outcome. If the outcome is unconfirmed, some data may already have been removed;
> contact support before another request. Deletion does not cancel billing.
> Manage subscriptions separately with their provider, including Apple ID
> settings for Apple App Store subscriptions.

### Terms introduction and section 14

> Post Round is developed and operated by PR Coaching Software. In these terms,
> “we”, “us”, and “our” refer to PR Coaching Software, the operator of the
> Post Round app, website, and related services.

> You can request deletion at the Delete Account page after signing in,
> acknowledging permanent deletion, and typing the exact word DELETE. Deletion
> is permanent and removes access to account data covered by the process.
> Save anything you want to keep before confirming.

> The process is intended to remove your account identity and the profile, round,
> scorecard, and related coaching data covered by application cleanup, not to
> certify erasure from every store. Security/audit history, separate waitlist
> marketing records, and detached creator referral records may remain. Removal
> of external provider records, uploaded media, logs, backups, and published
> copies is not confirmed by this process. If the outcome is unconfirmed,
> contact support before another request because some data may already have
> been removed. Deletion does not cancel billing; manage subscriptions separately
> with their provider.

“Save anything you want to keep” replaces the former “Delete or export anything”
instruction: no new export capability is promised.

### Support introduction and deletion section

> Post Round is developed and operated by PR Coaching Software. Use the contact
> below for product support, privacy questions, or help with account deletion.

> Start at the public Delete Account page to review the steps and coverage limits
> before signing in. The action requires sign-in, acknowledgment of permanent
> deletion, and the exact word DELETE. Deletion cannot be undone and does not
> confirm erasure from every store; the page explains records that may remain.
> If the outcome is unconfirmed, some data may already have been removed.
> Contact us before another request.

> Account deletion does not cancel billing. Manage subscriptions separately with
> their provider. An Apple App Store subscription must be managed through your
> Apple ID settings.

### Public deletion introduction and instructions

> Post Round is developed and operated by PR Coaching Software. Deletion is
> permanent. If you need help before continuing, contact support@postroundcoach.com.

**Before you delete your account**

1. Read these instructions, then sign in to the Post Round account you want to
   delete. If you cannot sign in, contact support for account-access help.
2. Save anything you want to keep. Review the warnings, check the
   permanent-deletion acknowledgment, and type the exact word DELETE.
3. Select Permanently Delete Account once and wait for the result. If the
   outcome is unconfirmed, some data may already have been removed. Contact
   support before another request; do not retry to find out what happened.

> The process is intended to remove your account identity and the profile,
> round, scorecard, and related coaching data covered by application cleanup.
> It is not temporary deactivation and cannot be undone. It does not confirm
> erasure from every store.

> Security/audit history, separate waitlist marketing records, and detached
> creator referral records may remain. Removal of external provider records,
> uploaded media, logs, backups, and published copies is not confirmed by this
> process. Contact support with questions about retained information or
> processing status.

> Deletion does not cancel billing. Manage subscriptions separately with their
> provider. For an Apple App Store subscription, cancel through your Apple ID
> settings to stop future charges.

> Read our Privacy Policy or visit Support for help.

Links retain `/privacy`, `/terms`, `/support`, `/delete-account`,
`mailto:support@postroundcoach.com` and the existing Apple cancellation help URL
`https://support.apple.com/en-us/HT202039`. Sign-in retains
`/login?next=/delete-account`.

### Metadata descriptions (product titles unchanged)

- Root: “Post Round captures your golf round while you play, helps you understand
  it afterward, and turns the moments that mattered into stories worth sharing.
  Developed and operated by PR Coaching Software.”
- Root Open Graph: “Your game. Your story. Your people. Play your round, learn
  from it, and share what mattered. Post Round is developed and operated by
  PR Coaching Software.”
- Privacy: “Learn how PR Coaching Software, the operator of Post Round, handles
  information when you use the app and website.”
- Terms: “Review the terms for Post Round, developed and operated by
  PR Coaching Software.”
- Support: “Contact PR Coaching Software for help with Post Round accounts,
  rounds, purchases, app issues, and deletion.”
- Deletion: “Review account deletion steps and coverage limits for Post Round,
  operated by PR Coaching Software.”

## Validation and safe reproduction

Run from the workspace root unless specified. Do not run recursive API live
tests or point deletion fixtures at a real service.

- `pnpm --filter @workspace/postround-web test`: **188 passed, 1 failed (189 total)**.
  The sole failure is `favorite amendment is function-only and guards both web
  success paths` in `src/lib/referrals/referrals.test.ts`. Its expected
  `CREATE OR REPLACE FUNCTION public.claim_creator_referral` is absent from
  `supabase/migrations/202610070001_web_referral_favorite.sql`, which contains
  only whitespace in both HEAD and the working tree. Unrelated to these copy
  changes; not repaired or treated as permission to change database schema.
- From `artifacts/postround-web`:
  `node --experimental-strip-types --test src/app/legal-pages-source.test.ts src/app/delete-account/*.test.ts src/lib/account-deletion/*.test.ts`:
  **66 passed, 0 failed**. Covers identity, canonical links, public instructions,
  exact confirmation/authentication gates, single attempt, response classification,
  safe diagnostics, cleanup and navigation outcomes.
- `pnpm --filter @workspace/postround-web typecheck`: **passed**.
- Production build: **passed** through the existing Playwright app runner,
  which invokes `pnpm run build` into isolated `.next-e2e`, then starts Next in
  production mode on loopback. Completed `BUILD_ID` and prerender manifest contain
  all five public routes. Configuration is the existing fixture configuration:
  Supabase URL and API origin `http://127.0.0.1:54321`, fake anon key
  `e2e-anon-key`, `NEXT_PUBLIC_POSTROUND_ALLOW_LOCAL_API=true`, and port 3100.
  These are deliberate local mocks, not validated production environment inputs.
  No real account/API deletion was contacted. The runner restores generated
  TypeScript files, does not share preview output, and preserves production
  configuration guards.
- Browser command:
  `pnpm exec sh artifacts/postround-web/e2e/run-tests.sh public-business-identity.spec.ts delete-account-confirmation.spec.ts delete-account-outcomes.spec.ts`.
  The first run built successfully but had missing-browser/installation-time
  launch failures. Installed the matching Chromium with
  `pnpm exec playwright install chromium`; also corrected the new test's
  footer locator to respect the existing homepage nesting (no app behavior
  changed). Reran with `E2E_USE_EXISTING_BUILD=1` using the completed unchanged
  application build. This flag is valid only for an already completed, fresh
  isolated fixture build, not a production deployment.
  That run passed all **47 existing deletion checks**, the desktop public-page
  check and the no-JavaScript public-instructions check. Its single failure
  exposed a real 16px homepage overflow at a 390px viewport. A read-only Chromium
  comparison found `scrollWidth=406` in **both production baseline and local
  preview**, caused by offscreen horizontal FadeIn transforms. The minimal
  correction is `overflow-x-clip` on the existing homepage main element; it does
  not change content, layout dimensions or animation timing. The public suite
  passed **3/3** against a fresh isolated production build after this correction;
  the unchanged deletion flows did not need another full browser pass.
  Final coverage: **47/47 deletion browser regressions plus 3/3 public browser
  checks passed**. The final public checks verified all five anonymous routes,
  footer link clicks, product titles, operator descriptions, visible attribution,
  no console/page errors and no horizontal overflow at **1440×1000** and
  **390×844**, plus deletion instructions with JavaScript disabled.
- Lint: no standalone lint command is configured in the web package; no new lint
  setup introduced.
- `git diff --check`: **passed**.
- Managed preview restarted after the copy edits and again after the isolated
  mobile-overflow correction; it became ready and served the homepage with 200.
  Mobile deletion screenshot at
  `generated-artifacts/business-operator/preview-mobile-deletion.jpg` shows readable
  signed-out instructions. Preview screenshot console includes one resource 404;
  this alone does not establish a new application error. Isolated browser checks
  separately capture console/page errors on the changed public routes.
  The final desktop homepage preview screenshot is
  `generated-artifacts/business-operator/preview-desktop-home.jpg`; its console
  contained no error (only the development React tooling message).
  The ten final browser screenshots are
  `generated-artifacts/business-operator/{1440,390}-{home,privacy,terms,support,delete-account}-footer.png`.
  The desktop and mobile homepage-footer images were visually inspected:
  attribution wraps readably, canonical links remain visible and branding is intact.

### Owner-run production acceptance after merge and approved release

1. Record the approved hosting release identifier and time using the existing
   `PRODUCTION_WEB_DEPLOYMENT.md` process. Build with the owner's established
   production settings; never replace them with loopback fixtures.
2. Open `https://www.postroundcoach.com/` signed out. Verify the product name,
   **Play. Learn. Share.**, marketing sections and primary navigation remain intact.
   Scroll to the footer; verify the exact visible attribution, not only HTML
   source or metadata.
3. Click each footer link to `/privacy`, `/terms`, `/delete-account`, `/support`.
   Confirm each returns 200 without authentication, the operator is visible, the
   support mailto remains correct, and product-specific titles and descriptions
   render. Confirm all four footer links on every affected page.
4. At 1440px and 390px widths, check wrapping, readable policy text, footer
   attribution, no horizontal overflow, working navigation and no new console
   errors. Keep screenshots of the homepage footer and public instructions.
5. Read deletion instructions signed out: sign-in, permanent acknowledgment,
   exact DELETE, one submission, cleanup/retention limits, billing cancellation,
   support before another request for an unconfirmed outcome. Do **not** submit.
6. Obtain native-app/authoritative-service evidence separately for any claim of
   full Apple policy compliance, in-app initiation or all-store deletion. No such
   compliance or enrollment acceptance is certified by this website change.

Status: implemented and locally validated on the task branch; merge is handled
by task completion and is not yet claimed here. No publication was performed.
New-copy production verification and final production acceptance remain pending
an approved release. Initial production checks only establish the old-site baseline.
