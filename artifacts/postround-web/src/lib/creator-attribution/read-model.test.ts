import assert from 'node:assert/strict'
import test from 'node:test'
import { registerHooks } from 'node:module'

// Node's strip-types runner does not resolve Next aliases. These stubs keep
// the production query functions under test without a Next server or keys.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true }
    if (specifier === '@/lib/supabase/server') return { url: 'data:text/javascript,export const createClient=async()=>globalThis.fakeAuth', shortCircuit: true }
    if (specifier === '@/lib/supabase/service') return { url: 'data:text/javascript,export const createServiceClient=()=>globalThis.fakeServiceClient', shortCircuit: true }
    if (specifier === 'next/navigation') return { url: 'data:text/javascript,export const redirect=(path)=>{throw Error("redirect:"+path)}', shortCircuit: true }
    if (specifier === 'next/cache') return { url: 'data:text/javascript,export const unstable_noStore=()=>{}', shortCircuit: true }
    if (specifier === './definitions' && context.parentURL?.endsWith('/read-model.ts'))
      return nextResolve('./definitions.ts', context)
    return nextResolve(specifier, context)
  },
})

const { requireAdmin, referralService, overview, creatorRows, creatorDetail, attributionDetail } = await import('./read-model.ts')
const { parseFilters } = await import('./definitions.ts')
const creatorA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const creatorB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const player = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const eventId = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const claimId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
const linkId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

const records: Record<string, Record<string, unknown>[]> = {
  creator_profiles: [
    { id: creatorA, user_id: player, display_name: 'Alice', slug: 'alice', status: 'active', created_at: '2026-01-01' },
    { id: creatorB, user_id: null, display_name: 'Bob', slug: null, status: 'inactive', created_at: '2026-01-02' },
  ],
  creator_referral_links: [{ id: linkId, creator_id: creatorA, created_at: '2026-01-03' }],
  creator_referral_events: [
    { id: eventId, referral_link_id: linkId, platform: 'android', campaign: 'creator_referral', occurred_at: '2026-09-25T10:00:00Z', creator_attributions: [{ id: claimId }] },
    { id: '11111111-1111-1111-1111-111111111111', referral_link_id: linkId, platform: 'web', campaign: 'creator_referral', occurred_at: '2026-09-24T10:00:00Z', creator_attributions: [] },
  ],
  creator_attributions: [
    { id: claimId, user_id: player, creator_id: creatorA, referral_link_id: linkId, referral_event_id: eventId, platform: 'android', attribution_method: 'android_install_referrer', attribution_source: 'creator_referral', campaign: 'creator_referral', attributed_at: '2026-09-25T11:00:00Z',
      profiles: { id: player, display_name: 'Player', subscription_plan: 'pro', subscription_status: 'active' } },
  ],
}

function fakeService(overrides: Partial<typeof records> = {}, forcedError?: { code: string; message: string }) {
  const tables = { ...records, ...overrides }
  const calls: { table: string; select: string; head: boolean; range?: [number, number] }[] = []
  const service = {
    from(table: string) {
      let rows = [...(tables[table] ?? [])]
      let head = false
      let select = ''
      let range: [number, number] | undefined
      const q = {
        select(columns: string, opts?: { head?: boolean }) { head = opts?.head ?? false; select = columns; return q },
        eq(key: string, value: unknown) {
          rows = rows.filter(row => key.startsWith('profiles.') ? (row.profiles as Record<string, unknown>)?.[key.slice(9)] === value : row[key] === value)
          return q
        },
        is(key: string, value: null) { rows = rows.filter(row => (row.profiles as Record<string, unknown>)?.[key.slice(9)] === value); return q },
        gte(key: string, value: string) { rows = rows.filter(row => String(row[key]) >= value); return q },
        lt(key: string, value: string) { rows = rows.filter(row => String(row[key]) < value); return q },
        or(expression: string) {
          const clauses = expression.split(',')
          rows = rows.filter(row => clauses.some(clause => {
            const match = clause.match(/^(\w+)\.(eq|ilike)\.(.*)$/)
            return !!match && (match[2] === 'eq' ? row[match[1]] === match[3] : String(row[match[1]]).toLowerCase().includes(match[3].replaceAll('%', '').toLowerCase()))
          }))
          return q
        },
        filter(key: string, operation: string) {
          if (key === 'creator_attributions') rows = rows.filter(row => operation === 'is' ? !(row.creator_attributions as unknown[]).length : !!(row.creator_attributions as unknown[]).length)
          return q
        },
        order(key: string, options?: { ascending?: boolean }) { rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (options?.ascending === false ? -1 : 1)); return q },
        limit(n: number) { rows = rows.slice(0, n); return q },
        range(a: number, b: number) { range = [a, b]; return q },
        maybeSingle() { return Promise.resolve(result(true)) },
        single() { return Promise.resolve(result(true)) },
        then(resolve: (value: ReturnType<typeof result>) => unknown, reject?: (reason: unknown) => unknown) { return Promise.resolve(result()).then(resolve, reject) },
      }
      function result(single = false) {
        calls.push({ table, select, head, range })
        const data = single ? rows[0] ?? null : head ? null : range ? rows.slice(range[0], range[1] + 1) : rows
        return { data, count: rows.length, error: forcedError ?? null }
      }
      return q
    },
  }
  return { service: service as never, calls }
}

test('verified admin required before service reads', async () => {
  ;(globalThis as { fakeAuth?: unknown }).fakeAuth = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } }
  await assert.rejects(requireAdmin(), /redirect:\/login/)
  ;(globalThis as { fakeAuth?: unknown }).fakeAuth = { auth: { getUser: async () => ({ data: { user: { app_metadata: { role: 'creator' } } }, error: null }) } }
  await assert.rejects(requireAdmin(), /redirect:\/dashboard/)
  ;(globalThis as { fakeAuth?: unknown }).fakeAuth = { auth: { getUser: async () => ({ data: { user: { app_metadata: { role: 'admin' } } }, error: null }) } }
  await requireAdmin()
})

test('a configured but unauthorized service key cannot return RLS-hidden zeroes', async () => {
  const client = {
    auth: { admin: { listUsers: async (options: unknown) => {
      assert.deepEqual(options, { page: 1, perPage: 1 })
      return { error: { message: 'forbidden' } as { message: string } | null }
    } } },
  }
  ;(globalThis as { fakeServiceClient?: unknown }).fakeServiceClient = client
  await assert.rejects(referralService(), /lacks admin privileges/)
  client.auth.admin.listUsers = async () => ({ error: null })
  assert.equal(await referralService(), client)
})

test('exact aggregates count clicks, claims and joined active subscribers independently', async () => {
  const { service, calls } = fakeService()
  assert.deepEqual(await overview(service), { creators: 2, links: 1, events: 2, players: 1, subscribers: 1 })
  assert.ok(calls.every(call => call.head && call.range === undefined))
  assert.ok(calls.filter(call => call.table === 'creator_attributions').some(call => call.select.includes('profiles!inner')))
  const { service: many } = fakeService({ creator_referral_events: Array.from({ length: 1201 }, (_, n) => ({ id: n })) })
  assert.equal((await overview(many)).events, 1201)
})

test('creators without links remain visible and cross-creator attribution stays separate', async () => {
  const { service, calls } = fakeService()
  const result = await creatorRows(service, parseFilters({}))
  assert.equal(result.count, 2)
  assert.deepEqual(result.rows.map(row => [row.display_name, row.events, row.players, row.subscribers]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))), [
    ['Alice', 2, 1, 1], ['Bob', 0, 0, 0],
  ])
  assert.ok(calls.some(call => call.table === 'creator_profiles' && call.range?.[0] === 0 && call.range?.[1] === 19))
  assert.equal((await creatorRows(service, parseFilters({ search: linkId }))).rows[0]?.id, creatorA)
  assert.equal((await creatorRows(service, parseFilters({ search: 'Bob' }))).rows[0]?.id, creatorB)
})

test('detail filters event state and attribution status without turning clicks into players', async () => {
  const { service } = fakeService()
  const detail = await creatorDetail(service, creatorA, parseFilters({ state: 'unclaimed', status: 'inactive' }))
  assert.equal(detail?.events.count, 1)
  assert.equal(detail?.attributions.count, 0)
  assert.equal(detail?.counts.players, 1)
  const claimed = await creatorDetail(service, creatorA, parseFilters({ state: 'claimed', platform: 'android', start: '2026-09-25', end: '2026-09-25', method: 'android_install_referrer', status: 'active' }))
  assert.equal(claimed?.events.count, 1)
  assert.equal(claimed?.attributions.count, 1)
  assert.equal((await creatorDetail(service, creatorB, parseFilters({})))?.counts.players, 0)
  const record = await attributionDetail(service, claimId)
  assert.equal(record?.event?.id, eventId)
  assert.equal(record?.link?.creator_id, creatorA)
  assert.equal(record?.attribution?.user_id, player)
})

test('source errors cannot be presented as valid zeroes', async () => {
  const { service } = fakeService({}, { code: 'PGRST205', message: 'missing' })
  await assert.rejects(overview(service), /migration rollout/)
})

test('empty results, click-only activity and non-active subscriptions remain separate', async () => {
  const { service: empty } = fakeService({
    creator_profiles: [], creator_referral_links: [], creator_referral_events: [], creator_attributions: [],
  })
  assert.deepEqual(await overview(empty), { creators: 0, links: 0, events: 0, players: 0, subscribers: 0 })
  assert.deepEqual((await creatorRows(empty, parseFilters({}))).rows, [])

  const { service: clicksOnly } = fakeService({
    creator_attributions: [], creator_referral_events: records.creator_referral_events,
  })
  const clicks = await overview(clicksOnly)
  assert.equal(clicks.events, 2)
  assert.equal(clicks.players, 0)
  assert.equal(clicks.subscribers, 0)

  const inactiveClaim = { ...records.creator_attributions[0], profiles: { id: player, subscription_status: 'past_due' } }
  const { service: nonSubscriber } = fakeService({ creator_attributions: [inactiveClaim] })
  assert.equal((await overview(nonSubscriber)).players, 1)
  assert.equal((await overview(nonSubscriber)).subscribers, 0)
  assert.equal((await creatorDetail(nonSubscriber, creatorA, parseFilters({})))?.counts.subscribers, 0)
})

test('pagination bounds creator and activity rows but preserves full exact counts', async () => {
  const extra = Array.from({ length: 45 }, (_, n) => ({ id: `id-${n}`, referral_link_id: linkId, platform: 'web', occurred_at: '2026-09-25T00:00:00Z', creator_attributions: [] }))
  const { service } = fakeService({ creator_referral_events: extra })
  const result = await creatorDetail(service, creatorA, parseFilters({ page: '2' }))
  assert.equal(result?.events.count, 45)
  assert.equal(result?.events.rows.length, 20)
  assert.equal(result?.counts.events, 45)
})