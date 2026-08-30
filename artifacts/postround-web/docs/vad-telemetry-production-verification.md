# VAD telemetry production verification

Verified on August 28, 2026.

## Source and server boundary

- Authoritative source: shared Supabase table `public.vad_telemetry_events`
- Established fields read: `id`, `user_id`, `client_round_id`, `hole_number`, `source`, `event_type`, `created_at`, and `metadata`
- Protected web-owned endpoint: `/admin-data/vad-diagnostics`
- Admin boundary: an authenticated Supabase user with `app_metadata.role === "admin"` is required before the server creates the privileged read client
- The service-role credential is used only by the server route and is never returned to or queried from the browser

## Known-good Round Buddy trace

Production rows establish this observable chain:

```text
Round Buddy metering in an Android Expo Go session
    ↓
events including vad_profile_selected, speech_paused,
silence_timer_armed/cancelled/fired, speech_ended,
and automatic_submission
    ↓
unavailable queue and flush code in the active external Replit mobile workspace
    ↓
unavailable authenticated persistence owner
    ↓
public.vad_telemetry_events
```

The newest 200 production rows queried on August 30, 2026 were all
`source = round_buddy`. They preserve the authenticated `user_id`, generated
`client_round_id`, hole number, event type, database timestamp, and metadata such as
`profile`, `platform`, `isExpoGo`, `audioRoute`, `connectionContext`, `delayMs`,
`maxSilenceMs`, and submission trigger. The latest rows were written on August 30.
Their `isExpoGo: true` metadata proves the active producer is a live Expo Go runtime
rather than a versioned EAS production build. The inaccessible Replit
workspace attribution comes separately from the project handoff and available
workspace inventory, not from that metadata field alone.

The connected GitHub account confirms that the source repository is the private
`PostRoundCoach/postroundcoach` repository. Its accessible `main` branch contains the
mobile app and API routes, but not the code that emitted those rows. A throttled
content scan of all 183 source/configuration files found no
`vad_telemetry_events`, `vadTelemetry`, `flushVadTelemetry`,
`setVadTelemetryContext`, or persisted event fingerprints.

Repository history explains the gap. Commit `774244e` added a direct mobile Supabase
writer with a different schema (`session_id`, `round_id`, `ai_session_id`, `feature`,
`event_name`, `occurred_at`, and `payload`). Commit `4de73f6` intentionally removed
that parallel implementation on August 28 as incompatible. Nevertheless, canonical
Round Buddy rows continued to be written on August 29 and 30. The stale
`agent/vad-telemetry-persistence` branch contains only the removed contract, while
`agent/remove-parallel-vad-contract` contains its removal.

Vercel contains only the `postround-web-api-server` Next.js project linked to
`PostRoundCoach/postround-web`; it is the diagnostics reader, not the mobile writer.
The accessible Supabase REST schema exposes no VAD-related RPC, and the GitHub
repository contains no Supabase Edge Function source. The exact event-construction,
queue, flush, persistence, and session-authentication function names therefore cannot
be recovered from any accessible source. They exist in the active external Replit
mobile workspace or its generated Expo bundle, neither of which is attached to this
workspace or committed to an accessible branch.

## Coaching trace and first divergence

The task input reports a `sessionMeteringHandler` that creates structured `COACH_*`
events and hands them to a `vadTelemetry` queue/`flushVadTelemetry` path. Those files
are not present in this workspace or the accessible owner-repository branches, so
their exact functions cannot be audited here. The first production query completed
before the real-device Coaching run and returned no non-Round-Buddy rows.

A later production query on August 30, 2026 confirmed 179 `source = coaching` rows
for one authenticated user and one `client_round_id`, with `hole_number = null` on
every row. The persisted event types were `coach_vad_init`, `coach_vad_profile`,
`coach_noise_floor`, `coach_meter`, `coach_speech_start`,
`coach_speech_end_candidate`, `coach_silence_timer_start`,
`coach_silence_timer_cancel`, and `coach_recording_stop`.

This proves the live Coaching producer reaches the same canonical table and preserves
the required association and diagnostic metadata. Persisted meter windows use
`windowTicks`, `minLevel`, `maxLevel`, `avgLevel`, `thresholdCrossings`, and
`silenceTimerCancellations`; the web read model recognizes those production names as
well as the generic aliases. Reviving the removed direct-Supabase branch or adding an
endpoint to the checked-in placeholder API would still create a second telemetry
architecture and was intentionally not done.

The evidence available here establishes the downstream contract: the protected route
selects the canonical table, accepts all established source values (`coaching`,
`ai_coaching`, and `coach`), does not filter event names, groups by the stored row
`user_id` plus `client_round_id`, and allows `hole_number = null`. The complete JSON
`metadata` object is retained in each event payload.

For Coaching rows, `COACH_*` environment/state fields are summarized without removing
the original payload. The diagnostics response exposes audio input/output routes,
VAD profile, noise floor, adaptive threshold, speech and silence state, aggregated
`COACH_METER` windows, route transitions, anomaly details, and a server-provided
`coachingSessionId` when that value is present in metadata.

## Required downstream contract

For Coaching telemetry to appear in this diagnostics implementation, the unavailable
mobile/API writer must insert rows equivalent to:

```text
user_id         = authenticated user (server-derived, never client-selected)
client_round_id = Coaching context clientRoundId
hole_number     = null
source          = coaching (or an already-established Coaching source alias)
event_type      = COACH_*
created_at      = server/database timestamp
metadata        = full diagnostic JSON, excluding raw audio/transcripts
```

The web query reads those seven columns plus `metadata`, authenticates an admin
Supabase user before creating the service client, and retrieves a selected session by
`client_round_id` (or the derived stored-user-scoped session key). The authenticated
admin authorizes this cross-user diagnostics read; writer-side derivation of
`user_id` cannot be verified without the unavailable telemetry write owner.
Profile filtering recognizes both the established Round Buddy `metadata.profile`
field and the Coaching `metadata.vadProfile` field before the query's 5,000-row cap,
then rechecks the normalized session profile in the read model.

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

The project owner confirmed the Coaching data in production Supabase. The verified
session contains 179 events across six completed recording stops and ten observed
turn IDs, with VAD initialization/profile context, noise-floor and adaptive-threshold
updates, aggregated meter windows, speech transitions, silence-timer activity, and
recording-stop events. No raw audio or transcripts were present in the inspected
metadata.

The August 30, 2026 local browser pass was also blocked before authentication because
this development workspace does not provide `NEXT_PUBLIC_SUPABASE_URL` or
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. The production configuration was previously verified,
but local `/admin/analytics` currently returns the existing configuration error until
those public Supabase values are supplied through the environment.

## Automated verification

- Focused telemetry tests: 14 passed
- TypeScript typecheck: passed
- Next.js production build: passed
- Vercel preview checks: passed
- Final code review: passed with no blockers

## Deterministic anomaly classification

Added August 30, 2026 as an additive diagnostics layer over the canonical
`public.vad_telemetry_events` read path.

### Rules

- Environmental: sustained and transient noise are identified from explicit noise
  events/reasons, stored duration, and metering ranges. Noise-floor rise requires a
  stored increase of at least 10 dB from an earlier session event; shifts of at least
  3 dB remain a separate informational subtype.
- VAD Behavior: false speech continuation requires repeated stored silence-timer
  cancellation plus absent/zero speech evidence. False starts, rejected candidates,
  missed speech, and silence timeouts require corresponding explicit fields or event
  outcomes.
- Audio / Device: Bluetooth transitions require differing stored old/new routes with
  a Bluetooth route. Unknown routes and large, non-transient metering instability
  remain separate subtypes.
- Context: automotive and outdoor noise require matching stored route, profile, or
  context values. Explicitly missing context uses `unknown_context`.
- Unknown: generic anomaly and terminal-failure records with insufficient causal
  evidence remain explicitly unknown rather than receiving an invented cause.

Every result separately reports detection, likely cause, VAD impact, severity,
confidence, explanation, and the exact stored fields used as evidence. Environmental
variation defaults to `info` or `low`; `high` requires stored user-impact,
submission-delay, or submission-prevention evidence, and `critical` is reserved for a
stored terminal recording/submission failure.

### Dashboard and filters

The existing session list now shows the highest-severity derived diagnosis and the
selected-session view shows all classifications both in a summary and beside the raw
chronological event. Raw payload inspection is unchanged. Derived filters cover
category, subtype, severity, confidence, profile, audio route, platform, and date/time.

### Database impact

None. No table, migration, duplicate event, writer, VAD runtime, threshold, recording,
timer, speech-streak, routing, or ingestion behavior changed. Classifications are
computed in the protected server read model for each request.

### Limitations and useful future telemetry

The classifier is intentionally conservative. It cannot prove physical causality from
metering alone, and it does not infer a failed automatic submission merely because a
bounded timeline lacks a submission event. Explicit outcome fields such as
`automaticSubmissionDelayed`, `automaticSubmissionPrevented`, a normalized
submission outcome, and explicit speech-candidate validity would increase confidence
in future diagnoses. They are useful future telemetry, not required or added here.