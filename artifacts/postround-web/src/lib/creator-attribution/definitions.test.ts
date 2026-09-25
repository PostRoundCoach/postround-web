import assert from 'node:assert/strict'
import test from 'node:test'
import { checked, nextDay, parseFilters, SourceFailure, total } from './definitions.ts'

const id = '11223344-5566-7788-99aa-bbccddeeff00'

test('bounded filters and inclusive UTC end date cannot broaden an invalid query', () => {
  const filters = parseFilters({
    creator: id, search: 'Ada%,.*(\\', start: '2026-09-25', end: '2026-09-25',
    platform: 'android', method: 'android_install_referrer', state: 'unclaimed',
    status: 'active', page: '2',
  })
  assert.equal(filters.creator, id)
  assert.equal(filters.search, 'Ada')
  assert.equal(filters.page, 2)
  assert.equal(filters.state, 'unclaimed')
  assert.equal(filters.platform, 'android')
  assert.equal(filters.method, 'android_install_referrer')
  assert.equal(filters.status, 'active')
  assert.equal(nextDay(filters.end!), '2026-09-26T00:00:00.000Z')
  assert.deepEqual(
    parseFilters({ creator: 'wrong', platform: 'all', status: 'paying', page: '-3', start: 'today', search: 'x'.repeat(500) }),
    { creator: null, search: 'x'.repeat(80), start: null, end: null, platform: null, method: null, status: null, state: null, page: 1 },
  )
})

test('exact count is used even above a capped row limit; zero is a valid count', () => {
  assert.equal(total({ count: 1304, error: null }), 1304)
  assert.equal(total({ count: 0, error: null }), 0)
  assert.throws(() => total({ count: null, error: null }), SourceFailure)
})

test('unapplied schema, denied access, and query failure are not empty results', () => {
  for (const code of ['42P01', 'PGRST205', 'PGRST200']) {
    assert.throws(() => checked({ error: { code, message: 'absent' } }), (e: unknown) => e instanceof SourceFailure && e.kind === 'missing')
  }
  assert.throws(() => checked({ error: { code: '42501', message: 'denied' } }), (e: unknown) => e instanceof SourceFailure && e.kind === 'access')
  assert.throws(() => checked({ error: { code: 'XX001', message: 'broken' } }), (e: unknown) => e instanceof SourceFailure && e.kind === 'query')
})