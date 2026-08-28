# VAD telemetry production verification

Verified on August 28, 2026.

## Source and server boundary

- Authoritative source: shared Supabase table `public.vad_telemetry_events`
- Established fields read: `id`, `user_id`, `client_round_id`, `hole_number`, `source`, `event_type`, `created_at`, and `metadata`
- Protected web-owned endpoint: `/admin-data/vad-diagnostics`
- Admin boundary: an authenticated Supabase user with `app_metadata.role === "admin"` is required before the server creates the privileged read client
- The service-role credential is used only by the server route and is never returned to or queried from the browser

## Production configuration

Vercel project `postround-web-api-server` was checked through the Vercel API. The production target has all required variable names configured:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No secret values were read or recorded.

The project deploys from GitHub branch `main`. Both `postroundcoach.com` and `www.postroundcoach.com` are verified custom domains.

## Deployment

- Final production commit: `593020e5bf45acb9c2905d874704e10371780247`
- Vercel deployment: `dpl_BtekXShGT8zTZAeKjwq4UgKvuuMz`
- Deployment state: `READY`
- Tested custom-domain page: `https://www.postroundcoach.com/admin/analytics`

## Persisted data and browser check

The shared production source returned 78 persisted `round_buddy` events grouped into one client round. The read model produced one `COURSE` profile session with Android context, automatic termination, zero failures, and one stored noise-pattern anomaly. Stored event names and metadata were preserved in chronological order.

The project owner performed the authenticated production browser check on the custom-domain page and confirmed that the Round Buddy session and selectable event timeline display correctly. Unauthenticated requests to the page and data route redirect to login as expected.

## Automated verification

- Focused telemetry tests: 11 passed
- TypeScript typecheck: passed
- Next.js production build: passed
- Vercel preview checks: passed
- Final code review: passed with no blockers