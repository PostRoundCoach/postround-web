export const VAD_EVENT_LIMIT = 5000
export const VAD_SESSION_LIMIT = 50

export type VadTelemetryRow = {
  id: string
  session_id: string
  round_id: string | null
  ai_session_id: string | null
  feature: 'round-buddy' | 'coaching'
  event_name: string
  occurred_at: string
  sequence: number
  vad_profile: string | null
  platform: string | null
  environment: string | null
  device: string | null
  termination: string | null
  duration_ms: number | null
  is_failure: boolean
  payload: unknown
}

export type VadFilters = {
  start: string | null
  end: string | null
  profile: string | null
  feature: string | null
  termination: string | null
  anomaliesOnly: boolean
  sessionId: string | null
}

type SessionAccumulator = {
  id: string
  timestamp: string | null
  feature: string | null
  profile: string | null
  environment: string | null
  device: string | null
  durationSeconds: number | null
  termination: string | null
  hasAnomaly: boolean
  hasFailure: boolean
  events: Array<{
    id: string
    name: string
    timestamp: string | null
    sequence: number
    payload: unknown
    severity: string | null
  }>
}

function timestampValue(value: string | null): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function roundPercent(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : null
}

function isAutomaticTermination(value: string | null): boolean {
  return value === 'silence' || value === 'initial-silence' || value === 'max-duration'
}

function isManualTermination(value: string | null): boolean {
  return value === 'manual'
}

function isAnomaly(row: VadTelemetryRow): boolean {
  const name = row.event_name.toLowerCase()
  return row.is_failure || name.includes('error') || name.includes('fail') || name.includes('anomal')
}

export function buildVadReadModel(
  rows: VadTelemetryRow[],
  filters: VadFilters,
  selectedSessionId: string | null
) {
  const malformedRecords: string[] = []
  const sessionsById = new Map<string, SessionAccumulator>()

  for (const row of rows) {
    if (!row?.session_id || !row.event_name || !row.occurred_at || !row.feature) {
      malformedRecords.push(row?.id ?? 'unknown')
      continue
    }

    const current = sessionsById.get(row.session_id) ?? {
      id: row.session_id,
      timestamp: row.occurred_at,
      feature: row.feature,
      profile: row.vad_profile,
      environment: row.environment ?? row.platform,
      device: row.device,
      durationSeconds: null,
      termination: null,
      hasAnomaly: false,
      hasFailure: false,
      events: [],
    }

    if (timestampValue(row.occurred_at) < timestampValue(current.timestamp)) {
      current.timestamp = row.occurred_at
    }
    current.profile ??= row.vad_profile
    current.environment ??= row.environment ?? row.platform
    current.device ??= row.device
    current.termination ??= row.termination
    if (row.duration_ms != null) current.durationSeconds = row.duration_ms / 1000
    current.hasFailure ||= row.is_failure
    current.hasAnomaly ||= isAnomaly(row)
    current.events.push({
      id: row.id,
      name: row.event_name,
      timestamp: row.occurred_at,
      sequence: row.sequence,
      payload: row.payload,
      severity: row.is_failure ? 'failure' : null,
    })
    sessionsById.set(row.session_id, current)
  }

  let sessions = [...sessionsById.values()]
  for (const session of sessions) {
    session.events.sort(
      (a, b) =>
        timestampValue(a.timestamp) - timestampValue(b.timestamp) ||
        a.sequence - b.sequence ||
        a.id.localeCompare(b.id)
    )
  }

  sessions = sessions
    .filter((session) => !filters.anomaliesOnly || session.hasAnomaly || session.hasFailure)
    .sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp) || a.id.localeCompare(b.id))

  const total = sessions.length
  const automatic = sessions.filter((session) => isAutomaticTermination(session.termination)).length
  const manual = sessions.filter((session) => isManualTermination(session.termination)).length
  const durations = sessions
    .map((session) => session.durationSeconds)
    .filter((value): value is number => value != null && Number.isFinite(value))

  const profileGroups = new Map<string, SessionAccumulator[]>()
  for (const session of sessions) {
    if (!session.profile) continue
    profileGroups.set(session.profile, [...(profileGroups.get(session.profile) ?? []), session])
  }

  const profiles = [...profileGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([profile, grouped]) => ({
      profile,
      sessions: grouped.length,
      automaticEndPercent: roundPercent(
        grouped.filter((session) => isAutomaticTermination(session.termination)).length,
        grouped.length
      ),
      manualPercent: roundPercent(
        grouped.filter((session) => isManualTermination(session.termination)).length,
        grouped.length
      ),
      failures: grouped.filter((session) => session.hasFailure).length,
      anomalies: grouped.filter((session) => session.hasAnomaly).length,
    }))

  const selected = selectedSessionId ? sessionsById.get(selectedSessionId) ?? null : null
  const page = sessions.slice(0, VAD_SESSION_LIMIT)

  return {
    status: 'ready' as const,
    source: {
      state: malformedRecords.length ? ('degraded' as const) : ('ready' as const),
      label: 'Supabase VAD telemetry',
      detail: malformedRecords.length
        ? `${malformedRecords.length} malformed event record(s) were skipped.`
        : 'Canonical mobile VAD events persisted in public.vad_telemetry_events.',
    },
    filters,
    summary: {
      sessions: total,
      automaticEndPercent: roundPercent(automatic, total),
      manualPercent: roundPercent(manual, total),
      failures: sessions.filter((session) => session.hasFailure).length,
      anomalies: sessions.filter((session) => session.hasAnomaly).length,
      averageDurationSeconds: durations.length
        ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10
        : null,
      availableMetrics: [
        'sessions',
        'automaticEndPercent',
        'manualPercent',
        'failures',
        'anomalies',
        ...(durations.length ? ['averageDurationSeconds'] : []),
      ],
    },
    filterOptions: {
      profiles: [...new Set(rows.map((row) => row.vad_profile).filter((value): value is string => !!value))].sort(),
      features: [...new Set(rows.map((row) => row.feature))].sort(),
      terminationCategories: [
        ...new Set(rows.map((row) => row.termination).filter((value): value is string => !!value)),
      ].sort(),
    },
    profiles,
    sessions: page.map(({ events: _events, ...session }) => session),
    selectedSession: selected,
    pagination: {
      page: 1,
      limit: VAD_SESSION_LIMIT,
      total,
      hasMore: total > VAD_SESSION_LIMIT,
    },
  }
}
