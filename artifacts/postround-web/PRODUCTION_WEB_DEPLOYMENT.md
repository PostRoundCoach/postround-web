# Post Round — production web deployment runbook

## Evidence and package

Prepared 2026-10-01 from local repository source only. **This is an executable-by-the-owner plan, not a production readiness certificate.** No external connection, credential-value inspection, SQL execution, deployment, or live smoke test was performed. All commands below are instructions for the deployment owner, not commands executed in this audit.

- [Environment checklist](PRODUCTION_ENV_CHECKLIST.md): consumers, timing, placement, defaults and evidence.
- [Environment template](PRODUCTION_ENV_TEMPLATE): safe placeholders; not a single file to upload to every host.
- [SQL deployment inventory](WEB_SQL_DEPLOYMENT_INVENTORY.md): all ten SQL files, dependency gates and historical SQL-bearing uploads.
- Existing supporting contracts: [Supabase workflow](supabase/README.md), [observational baseline](supabase/baseline/production-2026-09-17.md), [account deletion](docs/account-deletion-contract.md), [round contract](docs/round-web-contract.md), [referrals](supabase/creator-referrals.md), [creator auth investigation](docs/creator-stories-401-investigation.md).

Paths without links in this document are repository-root-relative; sibling links resolve from this web artifact. Historical reports and uploads establish provenance only, not current deployed state. No separate database repository or private migration ledger was available.

## 1. Pre-deployment: stop/go gates

Do not release until the owner records evidence for every relevant gate:

1. **Choose the actual canonical HTTPS web origin and separate authoritative API origin.** Confirm ownership, TLS, DNS, current Vercel project and production branch. Do not infer the intended domain from historical reports or `.replit`.
2. **Confirm existing production Supabase identity and complete schema history.** Web, mobile and API connector must refer to the intended same project. An empty project cannot be reconstructed from this migration set. Obtain reviewed authoritative baseline/core/evolved DDL from the database owner before attempting a fresh project.
3. **Reconcile SQL ledger and duplication.** Compare all nine migration files with the target ledger, object definitions and the separate database repository. Unknown means blocked, not “pending.” Review policies, grants, functions, triggers, backfills and cleanup ordering, not merely table existence.
4. **Provide a working API host with connector authorization.** The Express data/auth path depends on `@replit/connectors-sdk` and a Supabase connector, not just environment keys. Source does not establish portable connector authorization on another host. Keep a compatible authorized API deployment or separately resolve that hosting dependency before release. Merely uploading Express to Vercel will not solve it.
5. **Review admin content authorization before exposing privileged regeneration.** PATCH/DELETE `/api/admin/content/[id]` and POST `/api/admin/content/[id]/regenerate` check sign-in but do not explicitly check the admin role. The admin page layout does not protect direct route calls. RLS and the external Edge Function might restrict operations, but their complete enforcement is not proven here; the regenerate call uses service-role authorization. Treat this as an unresolved security release blocker, not something that setting a key fixes. Source: `src/app/api/admin/content/[id]/{route.ts,regenerate/route.ts}`.
6. **Confirm external Edge Function separately if regeneration is required.** Its deployment, implementation, auth, provider, secrets and cost are not present in this repository.
7. **Approve the actual supported product scope.** AI coaching/Player DNA generation and payment commerce are not implemented here. Do not advertise or test them as operational after configuring keys.
8. **Prepare recovery and manual test approval.** Record the previous web/API deployment, previous environment placement, backup/recovery owner and approved disposable test accounts. No fixture user from source is an approved production account.

### Deployment ownership

| Component | Production treatment / evidence |
| --- | --- |
| `artifacts/postround-web/src`, `public`, Next config and web package | Next.js 15 application: marketing/legal/support, auth, server-rendered dashboard/admin/creator pages, browser bundles, middleware and Next-owned route handlers. `package.json` pins React 19.1 and declares Next `^15.3.5`; use the lockfile resolution rather than installing “latest.” Public assets are served by Next; they are not a separate artifact deployment. |
| Web build inputs | Root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, web `tsconfig.json`, PostCSS and styles are build context. Preserve the monorepo rather than copying only the web directory and breaking workspace resolution. |
| `artifacts/api-server` | Separate Express 5 authoritative API process. Bundled by esbuild to `dist/index.mjs`; exposes `/api/content/*`, `/api/account/delete`, `/api/healthz`. Not deployed by the filtered web build. |
| Supabase | External Auth/PostgREST/database. SQL is reviewed database deployment material, not executed by `next build`, Vercel startup, or the web application. |
| Supabase content Edge Function | External `/functions/v1/<configured-name>` used by Next admin regeneration. Default name `generate-content-idea`; implementation is absent. |
| Mobile / canonical VAD writer | External and not shipped in this web artifact. Mobile round entry, Round Buddy, app store install processing and player story approval cannot be certified from this repository. Admin VAD endpoint is read-only. See `docs/vad-telemetry-production-verification.md`. |
| `lib/api-spec`, `lib/api-client-react`, `lib/api-zod` | Shared OpenAPI/codegen tooling and generated contracts; API uses Zod health contract. Generated clients are not a separately hosted API. `lib/api-client-react/src/custom-fetch.ts` base URL is injected by consumers. |
| `lib/db` | PostgreSQL/Drizzle scaffold with empty schema exports, not the Supabase schema authority. No basis to push it to production Supabase. |
| `artifacts/mockup-sandbox`, uploads, scripts, tests, docs | Design/preview or evidence/tooling, not production user flows. SQL-bearing uploads are historical evidence, not automatically migrations. Tests include fake services and a connector-backed live test; never run them against production by default. |
| `.replit`, artifact metadata, preview launcher | Replit routing/build context, not checked-in Vercel settings. Allowed dev origins are development only. `scripts/post-merge.sh` runs install and a Drizzle push: do not use it as a production deployment command. |

Nothing was removed. Historical, placeholder or mock material is not declared obsolete merely because it is not shipped.

### Routing and API ingress

Next owns `/api/health`, `/api/waitlist`, `/api/auth/callback`, `/api/auth/signout`, `/api/admin/content/[id]`, `/api/admin/content/[id]/regenerate`, `/api/admin/users/[id]/role`, `/api/coaching` and `/api/player-dna`. It also owns `/admin-data/vad-diagnostics`, `/r/[slug]`, `/referrals/claim` and `/creators/[slug]`.

Express (`artifacts/api-server/src/routes/{index,health,content,account}.ts`) owns:

- GET `/api/healthz`, `/api/content/stories`, `/api/content/creator-summary`, `/api/content/ideas`, `/api/content/round/:round_id`;
- POST `/api/content/generate`, `/api/content/draft`, `/api/content/stories/:storyId/approval-request`, `/api/content/stories/:storyId/dismissal`, `/api/account/delete`.

There is no exact health-route collision (`health` versus `healthz`), but both services use the `/api` namespace. Next has no checked-in API rewrite/proxy. Replit's API artifact claims `/api` in preview; that can intercept Next `/api` routes. Do not copy that broad prefix routing to production. A Vercel Next deployment should receive its own Next routes; the browser's absolute API base should point to the separate Express host. If an owner uses a shared gateway elsewhere, dispatch individual routes deliberately and verify both health endpoints; **the Vercel production validator rejects a same-origin API/site setting**.

Browser creator/deletion clients attach Supabase bearer tokens to cross-origin requests. `artifacts/api-server/src/app.ts` uses default permissive `cors()` and no configured origin allowlist. Confirm preflight/Authorization forwarding and the hosting security policy manually; do not invent a CORS environment variable. Do not weaken authentication to resolve a 401.

## 2. Database SQL from this repository

**No file is confirmed pending, and there is no unconditional “run these” list.** The inventory has nine conditional migration candidates plus one excluded test. For a reconciled existing schema only, candidate dependency order is:

1. `001_waitlist.sql`, `002_profiles.sql`, `003_admin_user_management.sql`: legacy definitions; reconcile evolved profiles/auth/admin behavior first.
2. `056_creator_identity.sql`: after the real profiles/auth prerequisites.
3. `057_story_candidates.sql`: after creator identity and actual rounds schema.
4. `058_creator_story_approval_requests.sql`: after story permissions.
5. `059_account_deletion.sql`: only after every referenced cleanup table/column exists.
6. `202609190001_public_creator_slugs.sql`: after creator identity.
7. `202609250001_creator_referrals.sql`: after profiles/creator identity/public-slug prerequisites and account deletion; its referral-aware cleanup replaces the earlier function.

The apparent filename order is not a complete database creation sequence. Missing rounds/holes/content ideas/telemetry and evolved columns must come from reviewed authoritative history **before the dependent web migrations**. Other-repository order and duplicate-object ownership cannot be determined offline. Do not separately execute files already represented by another migration; compare definitions and adopt a reviewed reconciliation plan.

`059` repeats `delete_own_account_data`; its final declaration wins within that file. The later referral migration intentionally replaces it again. Replaying `059` after referrals can remove referral cleanup. Legacy files contain object replacement and policies that are not safe to assume idempotent. Migration `003` backfills null roles; the referral migration does not bulk-backfill links or attributions and instead issues links lazily through its RPC. Review link creation, token security, storage/retention and cleanup. `supabase/tests/creator-referrals.sql` is **not for production**, even though it rolls back.

### Owner-run reconciliation workflow

Use [Supabase README](supabase/README.md) as the workflow authority. The repo has no complete Supabase CLI project configuration; confirm the CLI working directory actually recognizes `supabase/migrations` before any push. Normally use the web artifact as workdir; do not let a root-level command accidentally select a different project/history.

```sh
# Owner only; not executed in this audit.
cd artifacts/postround-web
supabase link --project-ref <owner-confirmed-production-project-ref>
supabase migration list
supabase db push --dry-run
```

Stop if the CLI needs configuration or proposes replaying legacy migrations/unexpected SQL. Do not initialize or repair a production history casually. Obtain a reviewed configuration/reconciliation change. Compare before/after ledger output, object definitions, RLS/grants, trigger bodies and the separate database repository. If an already-present version is proven, any `migration repair` requires separate review; never mark an unverified version applied.

Only after clone validation, backup and owner approval, and only when the dry-run matches **exactly** the approved pending migration set:

```sh
# Owner-approved database change only.
cd artifacts/postround-web
supabase db push
supabase migration list
```

Do not use SQL editor pastes, historical uploads, startup DDL, `pnpm --filter @workspace/db run push`, root post-merge hooks, or a blind `db reset` as production migration/recovery steps.

## 3. Configure production environment

Use [the full checklist](PRODUCTION_ENV_CHECKLIST.md), not `.env.local.example` alone.

- **Vercel public/build-time:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_POSTROUND_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`. Set explicit canonical site URL to avoid fallback ambiguity. These are client-visible, compiled values: changing them requires rebuilding and deploying, not only restarting.
- `next.config.ts` exposes `SUPABASE_ANON_KEY` as `NEXT_PUBLIC_SUPABASE_ANON_KEY` when the explicit public variable is absent. This must be an anon/public key, never a service-role key. Prefer the explicit public name to avoid accidental fallback.
- **Vercel server-only:** `SUPABASE_SERVICE_ROLE_KEY` for protected privileged paths; optional `SUPABASE_CONTENT_FUNCTION_NAME` and referral configuration (`ANDROID_STORE_URL`, `IOS_STORE_URL`, `WEB_FALLBACK_PATH`). Review the admin-content blocker before activating regeneration.
- **API host:** `SUPABASE_ANON_KEY`, a valid runtime `PORT`, and supported platform connector identity/authorization. A web service-role key does not replace the API connector. Keep platform-issued connector credentials on their platform; do not copy them into Vercel public configuration.
- **Local owner testing:** use untracked local environment files with the correct app working directory. Disable test-only API bypasses and custom Next test build directories for production. Do not upload `.env.local` or fixture credentials.
- **Platform/tooling:** allow each host to provide its own framework variables. Do not treat Node, Replit, Vercel and Playwright knobs as universally required production secrets. See checklist for every name and default.

### Supabase auth and data

`src/lib/supabase/client.ts` and `server.ts` use public URL/anon identity; the server uses SSR cookies. `service.ts` creates the privileged non-persisting client only on the server. Middleware and layouts enforce sessions, and protected admin paths must enforce roles independently. Admin role source is `app_metadata.role`, while profile/creator identity and story permissions are separate data.

Owner settings:

1. Set Supabase Auth Site URL to the confirmed canonical HTTPS web origin.
2. Allow the precise deployed `/api/auth/callback` redirect and reset callback variants used by the application; optionally allow explicitly approved preview/local callbacks separately, never broad unreviewed wildcard production access.
3. Verify password-signup email confirmation, **Confirm sign up** template delivering a six-digit `.Token`, rate limits, password policy and recovery email configuration. Signup now uses `signUp` with a user-chosen password, `verifyOtp` with `type: 'signup'`, and signup resend—not passwordless OTP creation. Follow [password signup acceptance](supabase/password-signup-acceptance.md). The deployed signup template/configuration and real email delivery are not proven by fixtures; incompatible settings block release and require separate approval, not silent configuration changes.
4. Verify password login, SSR cookie persistence and PKCE recovery. Forgot password sends `/api/auth/callback?next=/reset-password`; callback accepts only `/reset-password` or `/delete-account` as special next destinations. Login similarly allows `/delete-account`, otherwise dashboard. Signout uses configured site URL.
5. Confirm API issuer validation and connector-project identity both succeed. Issuer origin may be derived from JWT metadata by source; this is validation logic, not permission to accept any project. Align the connector with the public project without bypassing checks.
6. Verify RLS and RPC grants with ordinary users and cross-user negative checks; service-role reads bypass RLS and require prior server authorization. Missing public env can cause middleware to skip its auth refresh path; it is not a safe deployment mode.

Data prerequisites include `profiles`, `rounds`, `holes`, `content_ideas`, `waitlist`, `creator_profiles`, `creator_social_accounts`, `story_candidates`, `story_permissions`, `admin_audit_log`, `vad_telemetry_events`, and the three referral tables. RPC consumers: `get_public_creator_by_slug`, `issue_creator_referral`, `claim_creator_referral`, `delete_own_account_data`. See inventory for precise source locations and absent DDL.

### OpenAI: no operational client in this source

No source-discovered OpenAI key/model/client is used by the implemented web/API routes. `/api/coaching` and `/api/player-dna` return 501 for authenticated requests. The Story Engine (`artifacts/api-server/src/lib/story-engine.ts`) is local deterministic generation from stored evidence, not an OpenAI call. Generation/draft API capabilities do not mean the live Creator UI invokes them on load.

Do not add an invented `OPENAI_API_KEY` or model setting to this deployment template. If the external content Edge Function uses OpenAI, its owner must verify the designated production project/key, model, budget and secret placement on that external function's host. Those settings cannot be established here; configuring a key does not implement the web stubs.

### Stripe: no commerce integration in this source

No operational Stripe SDK/client, publishable/secret/webhook key consumer, checkout session, portal, webhook route, or product/price ID was found. A `stripe-replit-sync` workspace release-age exclusion is package-policy metadata, not an integration. Billing reads stored subscription data and explicitly offers no plan changes. No live/test Stripe configuration is selected by this code.

Do not configure invented Stripe variables, products, prices, credits or webhook URLs. Checkout/subscription creation/webhook entitlement updates/portal are unsupported. Existing mobile entitlements or external billing services require their owners' independent verification; web display does not prove billing operation.

## 4. Build and manually deploy the web

**Verified here means commands traced to source, not executed or proven green.** No build was run because this assignment is source-only.

Repository-root owner commands:

```sh
# Run only in the owner's intended checkout, after environment setup.
pnpm install --frozen-lockfile
pnpm --filter @workspace/postround-web run typecheck
NODE_ENV=production pnpm --filter @workspace/postround-web run build
```

The web build runs `node scripts/validate-production-api-origin.mjs && next build`. Guard: HTTPS API origin without `/api`, path/query/credentials/fragment; site origin provided by `NEXT_PUBLIC_SITE_URL` or `VERCEL_PROJECT_PRODUCTION_URL`. On Vercel Production API origin must differ from web origin. Root `pnpm run build` additionally typechecks/builds other artifacts; it is not the web-only deployment command.

### Proposed manual Vercel project settings — not checked in

No `vercel.json` or `.vercelignore` was found. No checked-in Vercel rewrites, cron or deployment command exists.

| Setting | Owner configuration / gate |
| --- | --- |
| Git checkout / production branch | Select the approved repository branch/commit containing the whole workspace. Confirm the actual project association manually. |
| Root Directory | `artifacts/postround-web`; allow build access to source outside Root Directory so the root lockfile/workspace can be used. If the Vercel project's monorepo behavior differs, stop and resolve install context rather than silently installing from an isolated directory. |
| Framework | Next.js, not Vite/static export. |
| Install command | With execution cwd at the web root, `cd ../.. && pnpm install --frozen-lockfile`. Verify build logs show the root lockfile and workspace. |
| Build command | `pnpm run build` from the web Root Directory (same guarded script as the filtered root command). |
| Output directory | Keep Next framework default `.next`; do not set `dist`, `out`, or test `NEXT_DIST_DIR`. No static export or standalone output is configured. |
| Node/pnpm | Source Replit runtime is Node 24 and lockfile format is pnpm 9. Select a compatible host runtime and pnpm version; no `packageManager` pin establishes an exact required pnpm release. Workspace binary overrides target Linux x64: other architectures are an unresolved compatibility gate. |
| Environment scopes | Populate Production before build; choose Preview separately. Do not rely on historic Vercel lists or Replit `[userenv]` to propagate. Even local production `NODE_ENV` invokes the guard. |
| Domain | Add the owner-confirmed canonical domain, verify DNS/TLS, decide canonical apex/www and redirect policy manually. No checked-in apex/www redirect exists. Keep metadata/auth/referral origins consistent. |

Use Vercel's manual deployment controls after reviewing the build output and environment scopes. There is no source-verified CLI publish command to reproduce; do not substitute an unreviewed `vercel --prod` workflow. Vercel runs Next through its adapter, not the preview proxy script.

For an owner-run self-hosted Next production process instead of Vercel:

```sh
# From repository root, after the production web build.
PORT=<owner-selected-web-port> pnpm --filter @workspace/postround-web run start
```

Separate API build/start recipe from repository root:

```sh
pnpm --filter @workspace/api-server run build
NODE_ENV=production PORT=<api-host-provided-port> pnpm --filter @workspace/api-server run start
```

These commands do not provision hosting or connector authorization. Deploy the API separately with its required identity and health route; do not use `dev` (which forces development mode) for production.

## 5. External services and URL/reference review

No implemented Stripe/OpenAI webhook or scheduled job was found. Do not create generic payment webhooks or cron tasks. Supabase trigger functions are database triggers, not host cron configuration. An external Edge Function may have other dependencies; verify its contract separately.

| Reference / category | Source location | Classification and owner action |
| --- | --- | --- |
| `https://postroundcoach-web.replit.app` as both web and API | root `.replit` production userenv; `docs/creator-stories-401-investigation.md` | Current checked-in assumption plus dated report, not live verification. Cannot copy the same-origin pair to Vercel Production; confirm API host and routing independently. |
| `postroundcoach.com`, `www.postroundcoach.com`, historic Vercel deployment | `docs/vad-telemetry-production-verification.md`; production-origin validator tests | Historical/user-supplied/test evidence, not established current ownership or DNS. Owner must supply canonical domain. |
| Checked-in Supabase project URL | root `.replit`; historical docs/uploads | Public project identifier intentionally not repeated here. Review every occurrence against intended project; public URL alone does not prove connector/service-key alignment. Do not bulk-copy old identifiers. |
| Public Supabase and issuer `/auth/v1/user` | `src/lib/supabase/{client,server,service}.ts`; API `creator-content-data.ts` | Actual runtime auth/data destinations. API issuer and connector identities must align. |
| `/functions/v1/<name>` | `src/app/api/admin/content/[id]/regenerate/route.ts` | External Edge Function URL assembled from Supabase URL. Deployment/provider/auth not present here. |
| Absolute API base + `/api/content/*`, `/api/account/delete` | `src/lib/creator-stories/client.ts`, `src/lib/account-deletion/client.ts` | Actual browser cross-origin dependency; bare origin only, never include `/api` twice. |
| Metadata/auth canonical URLs | `src/app/layout.tsx`, callback/signout handlers, forgot-password page | `NEXT_PUBLIC_SITE_URL`; fallback `localhost:3000` must not survive a public deployment. Vercel production host fallback is used by the guard and metadata, but is not a substitute for explicit canonical auth configuration in all consumers. |
| `/creators/[slug]`, `/r/[slug]`, `/referrals/claim`, `/signup` fallback | public creator page; `src/lib/referrals/{config,claim}.ts`; referral route | Implemented profile/referral paths. Check active/inactive slug behavior, referral cookie, claim and attribution; ownership/status validation matters. |
| Google Play / Apple destinations | `src/lib/referrals/config.ts` | Configured HTTPS only: `play.google.com/store/apps/details?id=...`, `apps.apple.com/...`. Missing/invalid values fall back to web. Android appends `pr_ref` install-referrer evidence; actual install claim is external, not proven. iOS store link alone does not implement deferred attribution. |
| Deep links/app identifiers/mobile contracts | `supabase/creator-referrals.md`, `docs/account-deletion-contract.md`, historical uploads | Contract/history only; mobile is not deployed here. No concrete native app ID, URI scheme, store listing ID, Android/iOS configuration or association file was found. Verify scheme/universal links, association files, store app identity and external mobile contract before promising install/deep-link completion. |
| `support@postroundcoach.com`; Apple subscription help | `src/app/support/page.tsx`; `src/app/delete-account/DeleteAccountClient.tsx` | Public support dependency, not a secret. Confirm inbox ownership and Apple help destination `https://support.apple.com/en-us/HT202039`. Account deletion does not cancel store subscriptions. |
| `postround.co` printed on share graphics | `src/components/creator/ShareableScorecardGraphic.tsx:154–155` | Current hardcoded brand/domain text, not a verified link or owned canonical domain. Conflicts with historic `postroundcoach.com` branding; owner review required before public exports. |
| Loopback ports and fake domains | `playwright.config.ts`, `e2e/`, `*.test.*`, `.env.local.example` | `127.0.0.1:54321`, `127.0.0.1:3100`, localhost/example/test API/image/social URLs are fixtures/examples, not production destinations. No test account is an approved live identity. |
| Replit development hosts | `next.config.ts`, `scripts/start-preview.mjs`, mockup Vite config | Preview-only host allowlists/proxy launcher; not production DNS/auth callback setup. |
| Broad remote image patterns | `next.config.ts`; public creator avatar/social data | Any HTTPS host allowed by Next image config. Review stored profile URLs, image availability and external-domain policy; source is not an availability/security guarantee. |
| SQL-bearing uploads and deployment reports | `attached_assets/`; linked SQL inventory provenance section | User-supplied historical instructions/DDL/URLs. Preserve as evidence; do not execute or choose current hosts from them. |
| Package/tool URLs and generated files | `pnpm-lock.yaml`, shared OpenAPI/codegen, public/design assets | Build/tool/reference material is not evidence of production APIs. Keep assets/fonts available to build/browser; do not promote generated mock endpoints to runtime services. |
| Google Fonts and local images/robots | `src/app/layout.tsx`, `src/app/page.tsx`, `public/`, mockup `index.html` | Next uses `next/font/google` for Playfair Display/DM Sans: owner build needs font-fetch access; generated fonts are self-hosted. Mockup Google stylesheet links are not production web dependencies. Marketing uses `/golf-course-aerial.jpg` and `/player-dna-visual.jpg`; retain all public assets. `robots.txt` allows all, no sitemap found; review intended indexing. |
| `${EXPO_PUBLIC_DOMAIN}` historic mobile API template | `attached_assets/Pasted-Update-the-Creator-Story-Dashboard-integration-based-on_1788551799889.txt:11–15` | Upload-only unresolved configuration, not an active web/API env read or a production URL to copy. |
| Schema/documentation URLs | mockup `components.json`, `next-env.d.ts`, legacy SQL comments, SVG assets | `ui.shadcn.com`, Next documentation, Supabase dashboard SQL-editor placeholder and W3C SVG namespace are tooling/reference families, not deployed business services. |

## 6. Owner-run production smoke-test sequence

Execute only after the owner deploys and explicitly approves disposable accounts/data. This audit ran none. Record status/error class and timestamp; never save bearer tokens, cookies, keys, email OTPs, raw player transcripts or sensitive fixture identities.

1. **Ingress first:** load canonical marketing/legal/support pages and assets on desktop/mobile; confirm canonical origin and intended apex/www redirect. Check Next `/api/health` and separate Express `/api/healthz`; a static health success alone does not verify Supabase or connector access. Verify no client requests go to localhost, preview hosts, wrong Supabase or doubled `/api`.
2. **Waitlist (writes data):** submit one approved test address, verify validation/duplicate handling and persistence through approved owner inspection. Check Next route is not swallowed by API ingress. Remove test data only through approved cleanup.
3. **Auth:** use an approved new account; signup OTP delivery/verification, login, logout, reset password through email callback, reset completion and session across refresh/new tab. Confirm redirect allowlist, expiry behavior, secure cookies and no cross-origin callback drift. Source signup is OTP; do not invent email-confirmation/password-signup screens.
4. **Access boundaries:** anonymous dashboard/admin/creator/deletion are denied appropriately. Ordinary player cannot access admin attribution/VAD or role mutation, another user's rounds, another creator's private stories or unauthorized transcripts. Review direct admin-content request authorization separately under gate 5; failure blocks release. Never test against another real user's data.
5. **Player views:** dashboard, round history and existing round detail/scorecard load from approved fixtures. Compare round scope/selected holes/partial-round totals to source contract rather than assuming 18 complete holes. Profile/settings render; their disabled edit controls are not implemented edit/save journeys. Billing shows stored subscription state or honest unavailable values, not invented credit/allowance balances.
6. **Creator:** approved active creator can open Studio, view queue/counts, load authorized round content, refresh/retry, request approval and dismiss. Verify persisted state after reload. Approval-request is not player approval; use separately approved external player flow to grant consent. Verify candidate/reflection text copy and approved-only PNG downloads (4:5 scorecard, transparent Round Highlights and eligible Player Note overlays); confirm notes toggle and long/18-hole layouts. No actual video export or direct social publishing exists. Pending/revoked content must never leak private transcript/scorecard. Generation/draft API calls may be separately owner-tested with approved data but are not automatic UI generation smoke steps.
7. **Public/referral (writes event/attribution data):** active slug page loads safe projection; unknown/inactive slug handled. Open `/r/[slug]` with an approved campaign and verify configured platform destination or safe `/signup` fallback. Complete web OTP/login claim and check immutable/idempotent attribution through approved admin read views; expiry/self-referral/invalid evidence should be rejected. Android install and iOS deferred linking remain external/manual integration checks, not web success claims.
8. **Admin:** approved admin sees users/content/attribution/VAD; non-admin denied. Role-change safeguards include self-demotion prevention. Do not claim real dashboard aggregate counts where source has placeholders. Content edit/delete and Edge regeneration mutate records; only test with disposable content after authorization gate resolution. External regeneration may be billable; confirm function cost and obtain approval first.
9. **Account deletion (destructive, optional controlled gate):** only for explicitly approved disposable owned account. Confirm warnings, typed confirmation and documented external bearer flow. Verify cleanup RPC, Auth deletion, logout and revoked sessions/data access using approved owner checks. API deletes app data before Auth user deletion; a later Auth failure requires careful retry/recovery, not a generic rollback. Confirm referrals/permissions/retained aggregates meet the reviewed deletion contract. Do not delete fixtures merely because they are in source. Store subscriptions are not cancelled by deletion.
10. **Expected unavailable:** authenticated `/api/coaching` and `/api/player-dna` return 501; Player DNA page is redirected/hidden. Do not run “AI report/credit deduction” tests. Round Buddy start/end/AI capture, round creation/editing, player create/claim/My Stories, credit consumption/purchases, Stripe checkout/subscription/webhook/portal are not implemented web journeys. External mobile/backend functionality requires a separate verified contract and deployment.

Supporting local E2E files use fake Supabase/API services; API live tests can contact the connector. Neither proves deployed behavior. Do not run root recursive tests with production environment loaded.

## 7. Rollback and troubleshooting

| Symptom | Inspect / response |
| --- | --- |
| Build rejects API origin or site origin | Correct public build-time origin placement; API must be bare HTTPS and distinct on Vercel Production. Rebuild. Do not disable the guard. |
| 404 on creator/account API or Next auth/waitlist | Check exact host/path ingress ownership; `/api/health` is not `/api/healthz`. Do not route all Next `/api` paths to Express. |
| Creator 401 with bearer present | Distinguish token parsing, issuer user validation, connector-project identity validation. Align projects and supported connector authorization; do not log JWTs or weaken auth. |
| Creator 403 / round missing | Verify active creator ownership, active/non-revoked permission, approved state and matching player/story/round identity. Do not bypass consent. |
| 429/transient connector failures | Inspect bounded retries/concurrency and API connector status safely; health alone is insufficient. Avoid repeated manual fan-out. |
| Missing relation/column/function, policy/grant error | Stop dependent features; compare schema/ledger against inventory and approved migration plan. Do not blindly push all SQL or repair ledger. |
| Regenerate 503 | Server service-role configuration missing; review authorization blocker before enabling. |
| Regenerate 502 | Unreachable/non-success external Edge Function. Provider and deployed function contract are unverified. Error body may contain provider details: sanitize before sharing logs. |
| Coaching/Player DNA 501 | Expected unsupported source capability, not a missing OpenAI secret. |
| Auth reset loops/incorrect redirect | Confirm site origin, Supabase allowlist/email template, callback next allowlist, cookies and host. Rebuild changed public URLs. |
| Referral falls back to signup | Check configured store host/path validation; absence is deliberate fallback, not evidence install tracking works. |
| Deletion partial failure | App data may already be removed before Auth deletion. Follow account deletion contract and review state with owner; do not recreate or delete blindly. |
| Billing unavailable/no purchase | Stored display only; no Stripe checkout integration to troubleshoot. |

Web rollback: use the hosting owner's previous approved deployment and matching environment settings. Changed public values require a new build even when reverting; verify dependent API/database contract compatibility. Roll back API deployment separately if appropriate, retaining connector alignment. A web rollback does not undo data writes, SQL, referrals, deletion or external provider costs.

Database recovery: stop affected writes, involve the database owner, inspect backup/recovery options and prepare a separately reviewed forward repair or restoration plan. Do not reverse migrations blindly, reapply `059` over referral-aware cleanup, drop tables, reset production or mark ledger entries without evidence.

### Handoff status

- **Ready at source/document level:** complete boundary, environment and SQL evidence package; no live readiness claim.
- **Manual configuration required:** canonical domain/Vercel settings, public build/runtime inputs, Supabase Auth/schema, authorized API host/connector and optional external Edge Function/store configuration.
- **SQL requiring manual deployment:** only owner-confirmed pending members of the nine-candidate inventory after reconciliation; zero confirmed pending here. Referral SQL test excluded.
- **Potential conflicts/blockers:** incomplete schema history and unknown other-repository duplication/ledger; same-origin historic settings versus Vercel guard; connector portability/alignment; admin content authorization; external function/mobile dependencies and unsupported AI/payment features.