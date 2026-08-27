-- Canonical, lightweight VAD diagnostics emitted by the mobile app.
-- Payloads contain only diagnostic metadata; never audio or transcript content.

create table if not exists public.vad_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id text not null check (char_length(session_id) between 1 and 120),
  round_id uuid references public.rounds(id) on delete set null,
  ai_session_id uuid references public.ai_sessions(id) on delete set null,
  feature text not null check (feature in ('round-buddy', 'coaching')),
  event_name text not null check (char_length(event_name) between 1 and 120),
  occurred_at timestamptz not null,
  sequence integer not null check (sequence >= 0),
  vad_profile text,
  platform text,
  environment text,
  device text,
  termination text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  is_failure boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, session_id, sequence)
);

create index if not exists vad_telemetry_events_occurred_at_idx
  on public.vad_telemetry_events (occurred_at desc);

create index if not exists vad_telemetry_events_session_idx
  on public.vad_telemetry_events (session_id, occurred_at, sequence);

create index if not exists vad_telemetry_events_feature_idx
  on public.vad_telemetry_events (feature, occurred_at desc);

alter table public.vad_telemetry_events enable row level security;

create policy "Users can insert own VAD telemetry"
  on public.vad_telemetry_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own VAD telemetry"
  on public.vad_telemetry_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can read VAD telemetry"
  on public.vad_telemetry_events
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
