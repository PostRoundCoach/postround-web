import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Execute the actual handler body with mocked Next/Supabase dependencies.
// This tests server orchestration, NOT PostgreSQL guards, RLS or atomicity.
const source = readFileSync(new URL('./claim.ts', import.meta.url), 'utf8')
const factory = new Function('cookies', 'createClient', 'REFERRAL_UUID',
  source.replace(/^import .*$/gm, '').replace('export async function', 'async function')
    .replace(": Promise<'none' | 'claimed' | 'invalid'>", '') +
  '\nreturn claimPendingWebReferral')
const original = '10000000-0000-4000-8000-000000000001'
const later = '10000000-0000-4000-8000-000000000002'

function fixture({ pending = later, existing = null, error = null, readError = null,
  data = [{ creator_id: 'original-creator' }] }: {
  pending?: string, existing?: { referral_event_id: string } | null,
  error?: { code: string } | null, readError?: object | null,
  data?: object[],
} = {}) {
  let deleted = false
  const calls: unknown[] = []
  const query = {
    select() { return this }, eq() { return this }, abortSignal() { return this },
    retry() { return this }, maybeSingle: async () => ({ data: existing, error: readError }),
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'authenticated-player' } }, error: null }) },
    from: () => query,
    rpc: async (name: string, args: unknown) => { calls.push({ name, args }); return { data, error } },
  }
  const claim = factory(async () => ({
    get: () => pending ? { value: pending } : undefined,
    delete: () => { deleted = true },
  }), async () => client, /^[0-9a-f-]{36}$/)
  return { claim, calls, deleted: () => deleted }
}

test('new pending claim delegates attribution/favorite to one RPC', async () => {
  const f = fixture()
  assert.equal(await f.claim(), 'claimed')
  assert.deepEqual(f.calls, [{ name: 'claim_creator_referral',
    args: { evidence_id: later, claim_method: 'web_referral' } }])
  assert.equal(f.deleted(), true)
})
test('established attribution retries trusted original evidence, not later/malformed cookie', async () => {
  for (const pending of [later, 'malformed']) {
    const f = fixture({ pending, existing: { referral_event_id: original } })
    assert.equal(await f.claim(), 'claimed')
    assert.deepEqual(f.calls, [{ name: 'claim_creator_referral',
      args: { evidence_id: original, claim_method: 'web_referral' } }])
    assert.equal(f.deleted(), true)
  }
})
test('transaction failure keeps fresh and established evidence retryable', async () => {
  for (const existing of [null, { referral_event_id: original }]) {
    const f = fixture({ existing, error: { code: 'P0001' } })
    await assert.rejects(f.claim(), /temporarily unavailable/)
    assert.equal(f.deleted(), false)
  }
})
test('no pending visit never invokes an RPC, even for established attribution', async () => {
  const f = fixture({ pending: '', existing: { referral_event_id: original } })
  assert.equal(await f.claim(), 'none')
  assert.deepEqual(f.calls, [])
})
test('terminal rejection/consumed evidence clears cookie; read failure retains it', async () => {
  for (const options of [{ pending: 'bad' }, { error: { code: '22023' } }, { data: [] }]) {
    const f = fixture(options)
    assert.equal(await f.claim(), 'invalid')
    assert.equal(f.deleted(), true)
  }
  const f = fixture({ readError: {} })
  await assert.rejects(f.claim(), /temporarily unavailable/)
  assert.equal(f.deleted(), false)
  assert.deepEqual(f.calls, [])
})
