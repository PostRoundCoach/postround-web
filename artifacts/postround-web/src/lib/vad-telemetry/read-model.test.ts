import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCoachingDiagnostics,
  buildVadReadModel,
  uniqueClientRoundIds,
  type VadFilters,
  type VadTelemetryRow,
} from './read-model.ts'

const filters: VadFilters = {
  start: null,
  end: null,
  profile: null,
  feature: null,
  termination: null,
  anomaliesOnly: false,
  sessionId: null,
}

function row(overrides: Partial<VadTelemetryRow>): VadTelemetryRow {
  return {
    id: 'event-1',
    user_id: 'user-1',
    client_round_id: 'session-1',
    hole_number: 1,
    source: 'round_buddy',
    event_type: 'vad_profile_selected',
    created_at: '2026-08-27T12:00:00.000Z',
    metadata: { platform: 'ios', profile: 'COURSE' },
    ...overrides,
  }
}

test('groups rows into sessions and preserves chronological event order', () => {
  const rows = [
    row({
      id: 'later',
      event_type: 'automatic_submission',
      created_at: '2026-08-27T12:00:02.000Z',
      metadata: { sequence: 2, termination: 'silence', durationMs: 2000 },
    }),
    row({ id: 'first', metadata: { sequence: 0, platform: 'ios', profile: 'COURSE' } }),
    row({
      id: 'middle',
      event_type: 'speech_paused',
      created_at: '2026-08-27T12:00:01.000Z',
      metadata: { sequence: 1 },
    }),
  ]
  const session = buildVadReadModel(rows, filters, null).sessions[0]
  const result = buildVadReadModel(rows, filters, session.id)

  assert.equal(result.summary.sessions, 1)
  assert.equal(result.summary.automaticEndPercent, 100)
  assert.equal(result.summary.averageDurationSeconds, 2)
  assert.deepEqual(
    result.selectedSession?.events.map((event) => event.name),
    ['vad_profile_selected', 'speech_paused', 'automatic_submission']
  )
})

test('calculates failures, profiles, and anomaly filtering from stored fields only', () => {
  const result = buildVadReadModel(
    [
      row({ metadata: { profile: 'COURSE' } }),
      row({
        id: 'failure',
        client_round_id: 'session-2',
        source: 'ai_coaching',
        event_type: 'recording_failed',
        created_at: '2026-08-27T13:00:00.000Z',
        metadata: { profile: 'QUIET' },
      }),
    ],
    { ...filters, anomaliesOnly: true },
    null
  )

  assert.equal(result.summary.sessions, 1)
  assert.equal(result.summary.failures, 1)
  assert.deepEqual(result.sessions.map((session) => session.clientRoundId), ['session-2'])
  assert.deepEqual(result.filterOptions.profiles, ['COURSE', 'QUIET'])
})

test('skips malformed source records and reports a degraded source', () => {
  const malformed = row({ id: 'bad', event_type: '' })
  const result = buildVadReadModel([malformed, row({ id: 'good' })], filters, null)

  assert.equal(result.source.state, 'degraded')
  assert.match(result.source.detail, /1 malformed/)
  assert.equal(result.summary.sessions, 1)
})

test('does not merge identical client session IDs from different users', () => {
  const result = buildVadReadModel(
    [
      row({ id: 'user-one', user_id: 'user-1' }),
      row({ id: 'user-two', user_id: 'user-2' }),
    ],
    filters,
    null
  )

  assert.equal(result.summary.sessions, 2)
  assert.equal(new Set(result.sessions.map((session) => session.id)).size, 2)
  assert.deepEqual(result.sessions.map((session) => session.clientRoundId), ['session-1', 'session-1'])

  const ambiguous = buildVadReadModel(
    [
      row({ id: 'user-one', user_id: 'user-1' }),
      row({ id: 'user-two', user_id: 'user-2' }),
    ],
    filters,
    'session-1'
  )
  assert.equal(ambiguous.selectedSession, null)
})

test('rejects invalid source timestamps as malformed', () => {
  const result = buildVadReadModel(
    [row({ id: 'invalid-date', created_at: 'not-a-date' })],
    filters,
    null
  )

  assert.equal(result.source.state, 'degraded')
  assert.equal(result.summary.sessions, 0)
})

test('filters sessions by the termination category derived from stored events', () => {
  const result = buildVadReadModel(
    [
      row({ id: 'automatic', event_type: 'automatic_submission' }),
      row({
        id: 'manual',
        client_round_id: 'session-2',
        event_type: 'manual_submission',
      }),
    ],
    { ...filters, termination: 'manual' },
    null
  )

  assert.deepEqual(result.sessions.map((session) => session.clientRoundId), ['session-2'])
})

test('filters Coaching sessions by vadProfile as well as Round Buddy profile metadata', () => {
  const result = buildVadReadModel(
    [
      row({ id: 'round-buddy', metadata: { profile: 'COURSE' } }),
      row({
        id: 'coaching',
        client_round_id: 'coach-session',
        source: 'coaching',
        event_type: 'COACH_VAD_PROFILE',
        metadata: { vadProfile: 'QUIET' },
      }),
    ],
    { ...filters, profile: 'QUIET' },
    null
  )

  assert.deepEqual(result.sessions.map((session) => session.clientRoundId), ['coach-session'])
})

test('skips non-object metadata instead of presenting missing context as valid', () => {
  const result = buildVadReadModel(
    [row({ id: 'bad-metadata', metadata: ['not', 'an', 'object'] })],
    filters,
    null
  )

  assert.equal(result.source.state, 'degraded')
  assert.equal(result.summary.sessions, 0)
})

test('selects an exact client round ID only when it identifies one session', () => {
  const result = buildVadReadModel(
    [row({ id: 'unique-event', client_round_id: 'unique-round' })],
    filters,
    'unique-round'
  )

  assert.equal(result.selectedSession?.clientRoundId, 'unique-round')
  assert.equal(result.selectedSession?.events[0]?.id, 'unique-event')
})

test('keeps Coaching rows with a nullable hole number and exposes every required event name', () => {
  const eventNames = [
    'COACH_VAD_INIT',
    'COACH_AUDIO_ROUTE',
    'COACH_VAD_PROFILE',
    'COACH_NOISE_FLOOR',
    'COACH_VAD_THRESHOLD',
    'COACH_METER',
    'COACH_SPEECH_START',
    'COACH_SPEECH_END_CANDIDATE',
    'COACH_SILENCE_TIMER_START',
    'COACH_SILENCE_TIMER_CANCEL',
    'COACH_RECORDING_STOP',
    'COACH_VAD_ANOMALY',
  ]
  const rows = eventNames.map((eventType, index) =>
    row({
      id: `coach-${index}`,
      source: 'coaching',
      event_type: eventType,
      hole_number: null,
      metadata: { sequence: index, coachingSessionId: 'coach-session-1', audioOutputRoute: 'car-bluetooth' },
    })
  )

  const result = buildVadReadModel(rows, filters, null)
  const session = result.sessions[0]
  const detail = buildVadReadModel(rows, filters, session.id).selectedSession

  assert.equal(result.summary.sessions, 1)
  assert.equal(detail?.feature, 'coaching')
  assert.equal(detail?.coachingSessionId, 'coach-session-1')
  assert.deepEqual(detail?.events.map((event) => event.name), eventNames)
  assert.equal(detail?.events.every((event) => (event.payload as { holeNumber?: number | null }).holeNumber === null), true)
  assert.equal(detail?.coachingDiagnostics.environment.audioOutputRoute, 'car-bluetooth')
})

test('preserves Coaching environment, state, aggregated meter, route, and anomaly diagnostics', () => {
  const diagnostics = buildCoachingDiagnostics([
    {
      id: 'init',
      name: 'COACH_VAD_INIT',
      timestamp: '2026-08-30T12:00:00.000Z',
      sequence: 0,
      severity: null,
      payload: {
        audioInputRoute: 'hearing-aid-bluetooth',
        audioOutputRoute: 'hearing-aid-bluetooth',
        vadProfile: 'QUIET',
        noiseFloor: 0.12,
        adaptiveThreshold: 0.25,
        speechState: 'listening',
        speechStreak: 2,
        silenceTimerState: 'idle',
        silenceTimerCancellations: 3,
      },
    },
    {
      id: 'meter',
      name: 'COACH_METER',
      timestamp: '2026-08-30T12:00:01.000Z',
      sequence: 1,
      severity: null,
      payload: {
        windowTicks: 20,
        minLevel: -68,
        maxLevel: -24,
        avgLevel: -41.5,
        thresholdCrossings: 2,
        silenceTimerCancellations: 1,
      },
    },
    {
      id: 'route',
      name: 'COACH_AUDIO_ROUTE',
      timestamp: '2026-08-30T12:00:02.000Z',
      sequence: 2,
      severity: null,
      payload: {
        oldAudioInputRoute: 'speaker',
        newAudioInputRoute: 'car-bluetooth',
        oldAudioOutputRoute: 'speaker',
        newAudioOutputRoute: 'car-bluetooth',
        oldVADProfile: 'COURSE',
        newVADProfile: 'QUIET',
        noiseFloorReset: true,
      },
    },
    {
      id: 'anomaly',
      name: 'COACH_VAD_ANOMALY',
      timestamp: '2026-08-30T12:00:03.000Z',
      sequence: 3,
      severity: null,
      payload: {
        reason: 'repeated silence timer cancellation',
        cancellationCount: 4,
        recordingDuration: 3.2,
        speechDetected: false,
      },
    },
  ])

  assert.deepEqual(diagnostics.environment, {
    audioInputRoute: 'car-bluetooth',
    audioOutputRoute: 'car-bluetooth',
    vadProfile: 'QUIET',
  })
  assert.deepEqual(diagnostics.vadState, {
    noiseFloor: 0.12,
    adaptiveThreshold: 0.25,
    speechState: 'listening',
    speechStreak: 2,
  })
  assert.deepEqual(diagnostics.silence, {
    silenceTimerState: 'idle',
    silenceTimerCancellations: 1,
  })
  assert.deepEqual(diagnostics.meterWindows[0], {
    sampleWindowStart: null,
    sampleWindowEnd: null,
    sampleCount: 20,
    minMetering: -68,
    maxMetering: -24,
    averageMetering: -41.5,
    thresholdCrossingCount: 2,
    silenceTimerCancellationCount: 1,
  })
  assert.deepEqual(diagnostics.routeChanges[0], {
    oldAudioInputRoute: 'speaker',
    newAudioInputRoute: 'car-bluetooth',
    oldAudioOutputRoute: 'speaker',
    newAudioOutputRoute: 'car-bluetooth',
    oldVADProfile: 'COURSE',
    newVADProfile: 'QUIET',
    noiseFloorReset: true,
  })
  assert.deepEqual(diagnostics.anomalies[0], {
    reason: 'repeated silence timer cancellation',
    cancellationCount: 4,
    recordingDuration: 3.2,
    speechDetected: false,
  })
})

test('keeps the complete selected Coaching timeline when profile discovery matches only context rows', () => {
  const rows = [
    row({
      id: 'profile',
      client_round_id: 'coach-round',
      source: 'coaching',
      event_type: 'coach_vad_profile',
      hole_number: null,
      metadata: { vadProfile: 'COURSE' },
    }),
    row({
      id: 'meter',
      client_round_id: 'coach-round',
      source: 'coaching',
      event_type: 'coach_meter',
      hole_number: null,
      metadata: {
        windowTicks: 25,
        minLevel: -70,
        maxLevel: -20,
        avgLevel: -42,
        thresholdCrossings: 8,
      },
    }),
    row({
      id: 'stop',
      client_round_id: 'coach-round',
      source: 'coaching',
      event_type: 'coach_recording_stop',
      hole_number: null,
      metadata: { trigger: 'silence' },
    }),
  ]
  const discoveryRows = rows.filter(
    (event) =>
      typeof event.metadata === 'object' &&
      event.metadata !== null &&
      'vadProfile' in event.metadata
  )
  const matchingIds = uniqueClientRoundIds(discoveryRows)
  const completeRows = rows.filter(
    (event) => event.client_round_id != null && matchingIds.includes(event.client_round_id)
  )
  const profileFilters = { ...filters, profile: 'COURSE' }
  const list = buildVadReadModel(completeRows, profileFilters, null)
  const detail = buildVadReadModel(completeRows, profileFilters, list.sessions[0].id).selectedSession

  assert.deepEqual(matchingIds, ['coach-round'])
  assert.deepEqual(
    detail?.events.map((event) => event.name).sort(),
    ['coach_vad_profile', 'coach_meter', 'coach_recording_stop'].sort()
  )
  assert.equal(detail?.coachingDiagnostics.meterWindows.length, 1)
})
