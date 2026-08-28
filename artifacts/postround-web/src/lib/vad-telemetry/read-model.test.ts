import assert from 'node:assert/strict'
import test from 'node:test'
import { buildVadReadModel, type VadFilters, type VadTelemetryRow } from './read-model.ts'

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
