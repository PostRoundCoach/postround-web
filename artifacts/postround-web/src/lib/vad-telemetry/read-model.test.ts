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
    session_id: 'session-1',
    session_key: 'key-1',
    round_id: null,
    ai_session_id: null,
    feature: 'round-buddy',
    event_name: 'BUDDY_RECORDING_STARTED',
    occurred_at: '2026-08-27T12:00:00.000Z',
    sequence: 0,
    vad_profile: null,
    platform: 'ios',
    environment: null,
    device: null,
    termination: null,
    duration_ms: null,
    is_failure: false,
    payload: {},
    ...overrides,
  }
}

test('groups rows into sessions and preserves chronological event order', () => {
  const result = buildVadReadModel(
    [
      row({
        id: 'later',
        event_name: 'BUDDY_RECORDING_STOPPED',
        occurred_at: '2026-08-27T12:00:02.000Z',
        sequence: 2,
        termination: 'silence',
        duration_ms: 2000,
      }),
      row({ id: 'first', sequence: 0 }),
      row({
        id: 'middle',
        event_name: 'BUDDY_SPEECH_DETECTED',
        occurred_at: '2026-08-27T12:00:01.000Z',
        sequence: 1,
      }),
    ],
    filters,
    'key-1'
  )

  assert.equal(result.summary.sessions, 1)
  assert.equal(result.summary.automaticEndPercent, 100)
  assert.equal(result.summary.averageDurationSeconds, 2)
  assert.deepEqual(
    result.selectedSession?.events.map((event) => event.name),
    ['BUDDY_RECORDING_STARTED', 'BUDDY_SPEECH_DETECTED', 'BUDDY_RECORDING_STOPPED']
  )
})

test('calculates failures, profiles, and anomaly filtering from stored fields only', () => {
  const result = buildVadReadModel(
    [
      row({ vad_profile: 'course-default' }),
      row({
        id: 'failure',
        session_id: 'session-2',
        session_key: 'key-2',
        feature: 'coaching',
        event_name: 'COACH_RECORDING_FAILED',
        occurred_at: '2026-08-27T13:00:00.000Z',
        is_failure: true,
        vad_profile: 'quiet',
      }),
    ],
    { ...filters, anomaliesOnly: true },
    null
  )

  assert.equal(result.summary.sessions, 1)
  assert.equal(result.summary.failures, 1)
  assert.deepEqual(result.sessions.map((session) => session.id), ['key-2'])
  assert.deepEqual(result.filterOptions.profiles, ['course-default', 'quiet'])
})

test('skips malformed source records and reports a degraded source', () => {
  const malformed = row({ id: 'bad', event_name: '' })
  const result = buildVadReadModel([malformed, row({ id: 'good' })], filters, null)

  assert.equal(result.source.state, 'degraded')
  assert.match(result.source.detail, /1 malformed/)
  assert.equal(result.summary.sessions, 1)
})

test('does not merge identical client session IDs from different users', () => {
  const result = buildVadReadModel(
    [
      row({ id: 'user-one', user_id: 'user-1', session_key: 'key-1' }),
      row({ id: 'user-two', user_id: 'user-2', session_key: 'key-2' }),
    ],
    filters,
    null
  )

  assert.equal(result.summary.sessions, 2)
  assert.deepEqual(result.sessions.map((session) => session.id), ['key-1', 'key-2'])
})

test('rejects invalid source timestamps as malformed', () => {
  const result = buildVadReadModel(
    [row({ id: 'invalid-date', occurred_at: 'not-a-date' })],
    filters,
    null
  )

  assert.equal(result.source.state, 'degraded')
  assert.equal(result.summary.sessions, 0)
})
