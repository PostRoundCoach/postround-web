export const VAD_EVENT_LIMIT = 5000
export const VAD_SESSION_LIMIT = 50

export type VadTelemetryRow = {
  id: string
  user_id: string
  client_round_id: string | null
  hole_number: number | null
  source: string
  event_type: string
  created_at: string
  metadata: unknown
}

export type VadEvent = {
  id: string
  name: string
  timestamp: string | null
  sequence: number | null
  payload: unknown
  severity: string | null
}

export type VadCoachingDiagnostics = {
  hasCoachingEvents: boolean
  coachingSessionId: string | null
  environment: {
    audioInputRoute: string | null
    audioOutputRoute: string | null
    vadProfile: string | null
  }
  vadState: {
    noiseFloor: number | null
    adaptiveThreshold: number | null
    speechState: string | null
    speechStreak: number | null
  }
  silence: {
    silenceTimerState: string | null
    silenceTimerCancellations: number | null
  }
  meterWindows: Array<{
    sampleWindowStart: string | null
    sampleWindowEnd: string | null
    sampleCount: number | null
    minMetering: number | null
    maxMetering: number | null
    averageMetering: number | null
    thresholdCrossingCount: number | null
    silenceTimerCancellationCount: number | null
  }>
  routeChanges: Array<Record<string, unknown>>
  anomalies: Array<Record<string, unknown>>
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
  clientRoundId: string
  timestamp: string | null
  feature: string | null
  profile: string | null
  environment: string | null
  device: string | null
  durationSeconds: number | null
  termination: string | null
  hasAnomaly: boolean
  hasFailure: boolean
  coachingSessionId: string | null
  coachingDiagnostics: VadCoachingDiagnostics
  events: VadEvent[]
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
  return value === 'automatic' || value === 'silence' || value === 'initial-silence' || value === 'max-duration'
}

function isManualTermination(value: string | null): boolean {
  return value === 'manual'
}

function isAnomaly(row: VadTelemetryRow): boolean {
  const name = row.event_type.toLowerCase()
  return (
    name.includes('error') ||
    name.includes('fail') ||
    name.includes('anomal') ||
    name.includes('noise_pattern')
  )
}

function metadataString(metadata: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function metadataNumber(metadata: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function isMetadataRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sessionKey(userId: string, clientRoundId: string): string {
  let first = 2166136261
  let second = 5381
  const input = `${userId}\u0000${clientRoundId}`
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    first = Math.imul(first ^ code, 16777619)
    second = Math.imul(second ^ code, 33)
  }
  return `session-${(first >>> 0).toString(16).padStart(8, '0')}-${(second >>> 0).toString(16).padStart(8, '0')}`
}

function sourceFeature(source: string | null | undefined): 'round-buddy' | 'coaching' | null {
  if (!source) return null
  const normalized = source.toLowerCase().replaceAll('-', '_')
  if (normalized === 'round_buddy' || normalized === 'buddy') return 'round-buddy'
  if (normalized === 'coaching' || normalized === 'ai_coaching' || normalized === 'coach') return 'coaching'
  return null
}

function eventMetadata(event: VadEvent): Record<string, unknown> {
  return isMetadataRecord(event.payload) ? event.payload : {}
}

function latestMetadataString(events: VadEvent[], ...keys: string[]): string | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const value = metadataString(eventMetadata(events[index]), ...keys)
    if (value) return value
  }
  return null
}

function latestMetadataNumber(events: VadEvent[], ...keys: string[]): number | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const value = metadataNumber(eventMetadata(events[index]), ...keys)
    if (value != null) return value
  }
  return null
}

function pickMetadata(metadata: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.flatMap((key) => (key in metadata ? [[key, metadata[key]]] : [])))
}

export function buildCoachingDiagnostics(events: VadEvent[]): VadCoachingDiagnostics {
  const coachingEvents = events.filter((event) => event.name.toUpperCase().startsWith('COACH_'))
  const meterWindows = coachingEvents
    .filter((event) => event.name.toUpperCase() === 'COACH_METER')
    .map((event) => {
      const metadata = eventMetadata(event)
      return {
        sampleWindowStart: metadataString(metadata, 'sampleWindowStart', 'sample_window_start'),
        sampleWindowEnd: metadataString(metadata, 'sampleWindowEnd', 'sample_window_end'),
        sampleCount: metadataNumber(metadata, 'sampleCount', 'sample_count', 'windowTicks'),
        minMetering: metadataNumber(metadata, 'minMetering', 'min_metering', 'minLevel'),
        maxMetering: metadataNumber(metadata, 'maxMetering', 'max_metering', 'maxLevel'),
        averageMetering: metadataNumber(metadata, 'averageMetering', 'average_metering', 'avgLevel'),
        thresholdCrossingCount: metadataNumber(
          metadata,
          'thresholdCrossingCount',
          'threshold_crossing_count',
          'thresholdCrossings'
        ),
        silenceTimerCancellationCount: metadataNumber(
          metadata,
          'silenceTimerCancellationCount',
          'silence_timer_cancellation_count',
          'silenceTimerCancellations'
        ),
      }
    })
  const routeChanges = coachingEvents
    .filter((event) => event.name.toUpperCase() === 'COACH_AUDIO_ROUTE')
    .map((event) =>
      pickMetadata(eventMetadata(event), [
        'oldAudioInputRoute',
        'newAudioInputRoute',
        'oldAudioOutputRoute',
        'newAudioOutputRoute',
        'oldVADProfile',
        'newVADProfile',
        'noiseFloorReset',
      ])
    )
  const anomalies = coachingEvents
    .filter((event) => event.name.toUpperCase() === 'COACH_VAD_ANOMALY')
    .map((event) => pickMetadata(eventMetadata(event), ['reason', 'cancellationCount', 'recordingDuration', 'speechDetected']))

  return {
    hasCoachingEvents: coachingEvents.length > 0,
    coachingSessionId: latestMetadataString(coachingEvents, 'coachingSessionId', 'coaching_session_id'),
    environment: {
      audioInputRoute: latestMetadataString(coachingEvents, 'audioInputRoute', 'audio_input_route', 'newAudioInputRoute'),
      audioOutputRoute: latestMetadataString(coachingEvents, 'audioOutputRoute', 'audio_output_route', 'newAudioOutputRoute'),
      vadProfile: latestMetadataString(coachingEvents, 'vadProfile', 'profile', 'newVADProfile'),
    },
    vadState: {
      noiseFloor: latestMetadataNumber(coachingEvents, 'noiseFloor', 'noise_floor'),
      adaptiveThreshold: latestMetadataNumber(coachingEvents, 'adaptiveThreshold', 'adaptive_threshold'),
      speechState: latestMetadataString(coachingEvents, 'speechState', 'speech_state'),
      speechStreak: latestMetadataNumber(coachingEvents, 'speechStreak', 'speech_streak'),
    },
    silence: {
      silenceTimerState: latestMetadataString(coachingEvents, 'silenceTimerState', 'silence_timer_state'),
      silenceTimerCancellations: latestMetadataNumber(
        coachingEvents,
        'silenceTimerCancellations',
        'silence_timer_cancellations'
      ),
    },
    meterWindows,
    routeChanges,
    anomalies,
  }
}

export function mapFeatureToSources(feature: string): string[] {
  return feature === 'round-buddy'
    ? ['round_buddy', 'round-buddy', 'buddy']
    : ['coaching', 'ai_coaching', 'coach']
}

export function uniqueClientRoundIds(
  rows: Array<Pick<VadTelemetryRow, 'client_round_id'>>
): string[] {
  return [
    ...new Set(
      rows
        .map((row) => row.client_round_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    ),
  ]
}

function terminationFromEvent(eventType: string, metadata: Record<string, unknown>): string | null {
  const stored = metadataString(metadata, 'termination', 'terminationReason')
  if (stored) return stored
  const name = eventType.toLowerCase()
  if (name.includes('automatic_submission') || name.includes('silence_timer_fired')) return 'automatic'
  if (name.includes('manual_submission')) return 'manual'
  return null
}

export function buildVadReadModel(
  rows: VadTelemetryRow[],
  filters: VadFilters,
  selectedSessionId: string | null
) {
  const malformedRecords: string[] = []
  const sessionsById = new Map<string, SessionAccumulator>()

  for (const row of rows) {
    if (
      !row?.user_id ||
      !row.client_round_id ||
      !row.event_type ||
      !row.created_at ||
      !row.source ||
      !sourceFeature(row.source) ||
      timestampValue(row.created_at) === 0 ||
      (row.metadata != null && !isMetadataRecord(row.metadata))
    ) {
      malformedRecords.push(row?.id ?? 'unknown')
      continue
    }

    const metadata = isMetadataRecord(row.metadata) ? row.metadata : {}
    const profile = metadataString(metadata, 'profile', 'vadProfile')
    const platform = metadataString(metadata, 'platform', 'environment')
    const audioRoute = metadataString(metadata, 'audioRoute')
    const bluetooth = metadataString(metadata, 'bluetoothDeviceType')
    const device = [audioRoute, bluetooth].filter((value) => value && value !== 'UNKNOWN').join(' · ') || null
    const termination = terminationFromEvent(row.event_type, metadata)
    const durationMs = metadataNumber(metadata, 'durationMs', 'duration_ms')
    const failure = row.event_type.toLowerCase().includes('fail') || row.event_type.toLowerCase().includes('error')

    const groupKey = `${row.user_id}:${row.client_round_id}`
    const current = sessionsById.get(groupKey) ?? {
      id: sessionKey(row.user_id, row.client_round_id),
      clientRoundId: row.client_round_id,
      timestamp: row.created_at,
      feature: sourceFeature(row.source),
      profile,
      environment: platform,
      device,
      durationSeconds: null,
      termination: null,
      hasAnomaly: false,
      hasFailure: false,
      coachingSessionId: null,
      coachingDiagnostics: buildCoachingDiagnostics([]),
      events: [],
    }

    if (timestampValue(row.created_at) < timestampValue(current.timestamp)) {
      current.timestamp = row.created_at
    }
    current.profile ??= profile
    current.environment ??= platform
    current.device ??= device
    current.termination ??= termination
    current.coachingSessionId ??= metadataString(metadata, 'coachingSessionId', 'coaching_session_id')
    if (durationMs != null) current.durationSeconds = durationMs / 1000
    current.hasFailure ||= failure
    current.hasAnomaly ||= isAnomaly(row)
    current.events.push({
      id: row.id,
      name: row.event_type,
      timestamp: row.created_at,
      sequence: metadataNumber(metadata, 'sequence'),
      payload: {
        source: row.source,
        holeNumber: row.hole_number,
        ...metadata,
      },
      severity: failure ? 'failure' : null,
    })
    sessionsById.set(groupKey, current)
  }

  let sessions = [...sessionsById.values()]
  for (const session of sessions) {
    session.events.sort(
      (a, b) =>
        timestampValue(a.timestamp) - timestampValue(b.timestamp) ||
        (a.sequence ?? 0) - (b.sequence ?? 0) ||
        a.id.localeCompare(b.id)
    )
    session.coachingDiagnostics = buildCoachingDiagnostics(session.events)
  }

  sessions = sessions
    .filter((session) => !filters.profile || session.profile === filters.profile)
    .filter((session) => !filters.termination || session.termination === filters.termination)
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

  const selectedByKey = selectedSessionId
    ? sessions.find((session) => session.id === selectedSessionId) ?? null
    : null
  const selectedByClientId = selectedSessionId
    ? sessions.filter((session) => session.clientRoundId === selectedSessionId)
    : []
  const selected = selectedByKey ?? (selectedByClientId.length === 1 ? selectedByClientId[0] : null)
  const page = sessions.slice(0, VAD_SESSION_LIMIT)

  return {
    status: 'ready' as const,
    source: {
      state: malformedRecords.length ? ('degraded' as const) : ('ready' as const),
      label: 'Supabase VAD telemetry',
      detail: malformedRecords.length
        ? `${malformedRecords.length} malformed event record(s) were skipped.`
        : 'Canonical mobile VAD events from the established public.vad_telemetry_events contract.',
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
      profiles: [
        ...new Set(
          rows
            .map((row) => (isMetadataRecord(row.metadata) ? metadataString(row.metadata, 'profile', 'vadProfile') : null))
            .filter((value): value is string => !!value)
        ),
      ].sort(),
      features: [
        ...new Set(
          rows
            .map((row) => sourceFeature(row.source))
            .filter((value): value is 'round-buddy' | 'coaching' => value != null)
        ),
      ].sort(),
      terminationCategories: [
        ...new Set(
          rows
            .map((row) => (isMetadataRecord(row.metadata) ? terminationFromEvent(row.event_type, row.metadata) : null))
            .filter((value): value is string => !!value)
        ),
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
