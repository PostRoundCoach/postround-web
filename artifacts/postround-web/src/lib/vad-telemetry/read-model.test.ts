import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCoachingDiagnostics,
  buildVadReadModel,
  classifyVadEvent,
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
  category: null,
  subtype: null,
  severity: null,
  confidence: null,
  audioRoute: null,
  platform: null,
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

test('classifies sustained and transient environmental noise without inventing impact', () => {
  const scenarios = [
    {
      event: {
        id: 'sustained',
        name: 'noise_pattern_detected',
        timestamp: '2026-08-30T12:00:00.000Z',
        payload: { durationMs: 8000, noiseFloor: -48, userImpact: false },
      },
      subtype: 'sustained_noise',
    },
    {
      event: {
        id: 'transient',
        name: 'noise_spike',
        timestamp: '2026-08-30T12:00:00.000Z',
        payload: { durationMs: 600, minLevel: -70, maxLevel: -25 },
      },
      subtype: 'transient_noise',
    },
  ]

  for (const scenario of scenarios) {
    const result = classifyVadEvent(scenario.event)
    assert.equal(result?.category, 'environmental')
    assert.equal(result?.subtype, scenario.subtype)
    assert.equal(result?.severity, 'low')
    assert.match(result?.vadImpact ?? '', /No apparent/)
  }
})

test('classifies a stored noise-floor rise using the previous event as evidence', () => {
  const events = [
    {
      id: 'before',
      name: 'COACH_NOISE_FLOOR',
      timestamp: '2026-08-30T12:00:00.000Z',
      payload: { noiseFloor: -73 },
    },
    {
      id: 'after',
      name: 'COACH_NOISE_FLOOR',
      timestamp: '2026-08-30T12:00:10.000Z',
      payload: { noiseFloor: -53, vadProfile: 'AUTOMOTIVE', audioRoute: 'bluetooth' },
    },
  ]
  const result = classifyVadEvent(events[1], events)

  assert.equal(result?.category, 'environmental')
  assert.equal(result?.subtype, 'noise_floor_rise')
  assert.equal(result?.severity, 'low')
  assert.deepEqual(result?.evidence, {
    event: 'COACH_NOISE_FLOOR',
    priorNoiseFloorEventId: 'before',
    noiseFloorBefore: -73,
    noiseFloorAfter: -53,
    noiseFloorDelta: 20,
    audioRoute: 'bluetooth',
    profile: 'AUTOMOTIVE',
  })
})

test('classifies false speech continuation as high only with stored user-impact evidence', () => {
  const result = classifyVadEvent({
    id: 'continuation',
    name: 'COACH_VAD_ANOMALY',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      reason: 'repeated silence timer cancellation',
      cancellationCount: 4,
      speechDetected: false,
      speechStreak: 0,
      automaticSubmissionDelayed: true,
    },
  })

  assert.equal(result?.category, 'vad_behavior')
  assert.equal(result?.subtype, 'false_speech_continuation')
  assert.equal(result?.severity, 'high')
  assert.equal(result?.vadImpact, 'Automatic submission delayed')
  assert.equal(result?.confidence, 'high')
})

test('keeps environmental noise high severity only when prevention is explicitly stored', () => {
  const result = classifyVadEvent({
    id: 'impacted-noise',
    name: 'noise_pattern_detected',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      reason: 'sustained noise',
      durationMs: 12000,
      automaticSubmissionPrevented: true,
    },
  })

  assert.equal(result?.category, 'environmental')
  assert.equal(result?.subtype, 'sustained_noise')
  assert.equal(result?.severity, 'high')
  assert.equal(result?.vadImpact, 'Automatic submission prevented')
})

test('classifies Bluetooth route changes from exact stored route fields', () => {
  const result = classifyVadEvent({
    id: 'route',
    name: 'COACH_AUDIO_ROUTE',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      oldAudioInputRoute: 'speaker',
      newAudioInputRoute: 'car-bluetooth',
      oldAudioOutputRoute: 'speaker',
      newAudioOutputRoute: 'car-bluetooth',
      noiseFloorReset: true,
    },
  })

  assert.equal(result?.category, 'audio_device')
  assert.equal(result?.subtype, 'bluetooth_route_change')
  assert.equal(result?.severity, 'low')
  assert.equal(result?.evidence.newAudioInputRoute, 'car-bluetooth')
})

test('uses an explicit unknown classification for incomplete anomaly telemetry', () => {
  const result = classifyVadEvent({
    id: 'unknown',
    name: 'COACH_VAD_ANOMALY',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {},
  })

  assert.equal(result?.category, 'unknown')
  assert.equal(result?.subtype, 'unknown')
  assert.equal(result?.confidence, 'medium')
  assert.equal(result?.vadImpact, 'Unknown')
})

test('filters derived diagnostics and preserves the original selected event payload', () => {
  const originalMetadata = {
    reason: 'repeated silence timer cancellation',
    cancellationCount: 3,
    speechDetected: false,
    speechStreak: 0,
    automaticSubmissionDelayed: true,
    platform: 'android',
    audioInputRoute: 'car-bluetooth',
    vadProfile: 'AUTOMOTIVE',
  }
  const rows = [
    row({
      id: 'diagnostic',
      source: 'coaching',
      event_type: 'COACH_VAD_ANOMALY',
      metadata: originalMetadata,
    }),
    row({
      id: 'other',
      client_round_id: 'other-session',
      event_type: 'noise_pattern_detected',
      metadata: { platform: 'ios', audioRoute: 'speaker', durationMs: 7000 },
    }),
  ]
  const diagnosticFilters: VadFilters = {
    ...filters,
    category: 'vad_behavior',
    subtype: 'false_speech_continuation',
    severity: 'high',
    confidence: 'high',
    audioRoute: 'car-bluetooth',
    platform: 'android',
  }
  const list = buildVadReadModel(rows, diagnosticFilters, null)
  const detail = buildVadReadModel(rows, diagnosticFilters, list.sessions[0].id).selectedSession

  assert.deepEqual(list.sessions.map((session) => session.clientRoundId), ['session-1'])
  assert.equal(detail?.classifications[0]?.subtype, 'false_speech_continuation')
  assert.deepEqual(detail?.events[0]?.payload, {
    source: 'coaching',
    holeNumber: 1,
    ...originalMetadata,
  })
})

test('does not apply future impact or cancellation evidence to an earlier event', () => {
  const events = [
    {
      id: 'early-noise',
      name: 'noise_pattern_detected',
      timestamp: '2026-08-30T12:00:00.000Z',
      payload: { durationMs: 9000 },
    },
    {
      id: 'later-impact',
      name: 'COACH_VAD_ANOMALY',
      timestamp: '2026-08-30T12:00:10.000Z',
      payload: {
        cancellationCount: 4,
        speechDetected: false,
        automaticSubmissionPrevented: true,
      },
    },
  ]
  const model = buildVadReadModel(
    events.map((event) =>
      row({
        id: event.id,
        event_type: event.name,
        created_at: event.timestamp,
        metadata: event.payload,
      })
    ),
    filters,
    null
  )

  const early = model.sessions[0].classifications.find((item) => item.eventId === 'early-noise')
  assert.equal(early?.severity, 'low')
  assert.equal(early?.vadImpact, 'No apparent VAD impact')
})

test('does not classify repeated timer cancellation as false continuation when valid speech is stored', () => {
  const result = classifyVadEvent({
    id: 'valid-speech',
    name: 'COACH_VAD_ANOMALY',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      reason: 'repeated silence timer cancellation',
      cancellationCount: 4,
      speechDetected: true,
      speechStreak: 3,
    },
  })

  assert.equal(result?.category, 'unknown')
  assert.equal(result?.subtype, 'unknown')
})

test('terminal recording failures remain critical even when submission prevention is also stored', () => {
  const result = classifyVadEvent({
    id: 'failure',
    name: 'COACH_RECORDING_FAILED',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      automaticSubmissionPrevented: true,
      errorMessage: 'microphone unavailable',
    },
  })

  assert.equal(result?.severity, 'critical')
  assert.equal(result?.subtype, 'unknown')
})

test('audio-route filters include every route observed across a transition', () => {
  const rows = [
    row({
      id: 'speaker',
      event_type: 'COACH_VAD_INIT',
      source: 'coaching',
      metadata: { platform: 'android', audioInputRoute: 'speaker' },
    }),
    row({
      id: 'bluetooth',
      event_type: 'COACH_AUDIO_ROUTE',
      source: 'coaching',
      created_at: '2026-08-30T12:00:01.000Z',
      metadata: {
        platform: 'android',
        oldAudioInputRoute: 'speaker',
        newAudioInputRoute: 'car-bluetooth',
      },
    }),
  ]
  const result = buildVadReadModel(rows, { ...filters, audioRoute: 'car-bluetooth' }, null)

  assert.equal(result.sessions.length, 1)
  assert.deepEqual(result.filterOptions.audioRoutes, ['car-bluetooth', 'speaker'])
})

test('does not classify ordinary meter windows or an undated wide range as instability', () => {
  const ordinary = classifyVadEvent({
    id: 'ordinary-meter',
    name: 'COACH_METER',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      windowTicks: 20,
      minLevel: -68,
      maxLevel: -24,
      avgLevel: -41,
      thresholdCrossings: 2,
    },
  })
  const noDuration = classifyVadEvent({
    id: 'wide-meter',
    name: 'COACH_METER',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: { minLevel: -80, maxLevel: -10 },
  })

  assert.equal(ordinary, null)
  assert.equal(noDuration, null)
})

test('does not call a complete non-Bluetooth route transition unknown', () => {
  const result = classifyVadEvent({
    id: 'wired-route',
    name: 'COACH_AUDIO_ROUTE',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      oldAudioInputRoute: 'speaker',
      newAudioInputRoute: 'wired-headset',
      oldAudioOutputRoute: 'speaker',
      newAudioOutputRoute: 'wired-headset',
    },
  })

  assert.equal(result, null)
})

test('treats UNKNOWN to Bluetooth as incomplete route evidence, not a confirmed transition', () => {
  const result = classifyVadEvent({
    id: 'unknown-bluetooth',
    name: 'COACH_AUDIO_ROUTE',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      oldAudioInputRoute: 'UNKNOWN',
      newAudioInputRoute: 'car-bluetooth',
    },
  })

  assert.equal(result?.subtype, 'audio_route_unknown')
  assert.equal(result?.severity, 'info')
})

test('uses only prior session context and identifies its source event in evidence', () => {
  const events = [
    {
      id: 'context',
      name: 'COACH_VAD_INIT',
      timestamp: '2026-08-30T12:00:00.000Z',
      payload: {
        connectionContext: 'vehicle',
        vadProfile: 'AUTOMOTIVE',
        audioInputRoute: 'car-bluetooth',
      },
    },
    {
      id: 'noise',
      name: 'noise_pattern_detected',
      timestamp: '2026-08-30T12:00:01.000Z',
      payload: { durationMs: 9000 },
    },
  ]
  const result = classifyVadEvent(events[1], events)

  assert.equal(result?.category, 'context')
  assert.equal(result?.subtype, 'automotive_noise')
  assert.equal(result?.evidence.contextSourceEventId, 'context')
  assert.equal(result?.evidence.profileSourceEventId, 'context')
  assert.equal(result?.evidence.audioRouteSourceEventId, 'context')
})

test('does not promote retrying or recovered outcome text to a terminal failure', () => {
  for (const submissionOutcome of ['temporary_error_retrying', 'upload_error_recovered']) {
    const result = classifyVadEvent({
      id: submissionOutcome,
      name: 'COACH_VAD_ANOMALY',
      timestamp: '2026-08-30T12:00:00.000Z',
      payload: { submissionOutcome },
    })

    assert.equal(result?.severity, 'info')
    assert.equal(result?.subtype, 'unknown')
  }
})

test('keeps exact current context keys in automotive evidence', () => {
  const result = classifyVadEvent({
    id: 'current-context',
    name: 'noise_pattern_detected',
    timestamp: '2026-08-30T12:00:00.000Z',
    payload: {
      durationMs: 8000,
      locationContext: 'vehicle cabin',
      newAudioOutputRoute: 'car-bluetooth',
    },
  })

  assert.equal(result?.subtype, 'automotive_noise')
  assert.equal(result?.evidence.sourceEventId, 'current-context')
  assert.equal(result?.evidence.locationContext, 'vehicle cabin')
  assert.equal(result?.evidence.newAudioOutputRoute, 'car-bluetooth')
})

test('requires all diagnostic filters to match the same classification', () => {
  const rows = [
    row({
      id: 'environmental-low',
      event_type: 'noise_pattern_detected',
      metadata: { durationMs: 8000 },
    }),
    row({
      id: 'vad-high',
      event_type: 'COACH_VAD_ANOMALY',
      created_at: '2026-08-30T12:00:01.000Z',
      metadata: {
        cancellationCount: 3,
        speechDetected: false,
        automaticSubmissionPrevented: true,
      },
    }),
  ]

  const mismatched = buildVadReadModel(
    rows,
    { ...filters, category: 'environmental', severity: 'high' },
    null
  )
  const matched = buildVadReadModel(
    rows,
    { ...filters, category: 'vad_behavior', severity: 'high' },
    null
  )

  assert.equal(mismatched.sessions.length, 0)
  assert.equal(matched.sessions.length, 1)
})

test('collects every input and output endpoint from a route transition', () => {
  const result = buildVadReadModel(
    [
      row({
        id: 'transition-only',
        source: 'coaching',
        event_type: 'COACH_AUDIO_ROUTE',
        metadata: {
          oldAudioInputRoute: 'built-in-mic',
          newAudioInputRoute: 'car-mic',
          oldAudioOutputRoute: 'speaker',
          newAudioOutputRoute: 'car-bluetooth',
        },
      }),
    ],
    filters,
    null
  )

  assert.deepEqual(result.filterOptions.audioRoutes, [
    'built-in-mic',
    'car-bluetooth',
    'car-mic',
    'speaker',
  ])
  assert.equal(
    buildVadReadModel(
      [
        row({
          id: 'transition-only',
          source: 'coaching',
          event_type: 'COACH_AUDIO_ROUTE',
          metadata: {
            oldAudioInputRoute: 'built-in-mic',
            newAudioInputRoute: 'car-mic',
            oldAudioOutputRoute: 'speaker',
            newAudioOutputRoute: 'car-bluetooth',
          },
        }),
      ],
      { ...filters, audioRoute: 'speaker' },
      null
    ).sessions.length,
    1
  )
})
