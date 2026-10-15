import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AccountDeletionApiError, AccountDeletionConfigurationError,
  AccountDeletionUnconfirmedError, requestAccountDeletion,
} from './client.ts'

process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'

test('exact request uses configured origin, bearer, JSON headers and no identity selectors/cookies/redirects', async () => {
  let calls = 0
  assert.deepEqual(await requestAccountDeletion('fixture-token', (async (url, init) => {
    calls++
    assert.equal(url, 'https://api.postround.test/api/account/delete')
    assert.equal(init?.method, 'POST')
    assert.deepEqual(Object.fromEntries(new Headers(init?.headers)), {
      authorization: 'Bearer fixture-token', 'content-type': 'application/json', accept: 'application/json',
    })
    assert.equal(init?.body, '{"confirmation":"DELETE"}')
    assert.equal(init?.credentials, 'omit')
    assert.equal(init?.redirect, 'error')
    return Response.json({ ok: true, deleted: true })
  }) as typeof fetch), { ok: true, deleted: true })
  assert.equal(calls, 1)
})

test('invalid or missing origin never falls back or sends a request', async () => {
  const original = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  try {
    for (const origin of ['', 'http://other.test', 'https://user:password@example.test', 'https://example.test/api', 'https://example.test?q=1', 'https://example.test/#hash', 'not a URL']) {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = origin
      await assert.rejects(() => requestAccountDeletion('fixture', (async () => {
        assert.fail('must not fetch')
      }) as typeof fetch), AccountDeletionConfigurationError)
    }
  } finally {
    process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = original
  }
})

const rejections = [
  [401, 'Authentication required'],
  [401, 'Invalid or expired session'],
  [401, 'Could not verify session'],
  [400, 'Confirmation must be "DELETE"'],
] as const

for (const [status, error] of rejections) {
  test(`exact rejection ${status}/${error} describes only this request`, async () => {
    await assert.rejects(() => requestAccountDeletion('fixture', (async () =>
      Response.json({ error }, { status })) as typeof fetch), (err: unknown) => {
      assert.ok(err instanceof AccountDeletionApiError)
      assert.ok(!(err instanceof AccountDeletionUnconfirmedError))
      assert.equal(err.retryable, false)
      assert.match(err.message, /This deletion request was rejected/)
      assert.match(err.message, /does not establish the outcome of any earlier request/)
      assert.equal(err.evidence?.status, status)
      assert.match(err.evidence?.classification ?? '', /_rejected$/)
      return true
    })
  })
}

const ambiguous: Array<[string, () => Response]> = [
  ['cleanup 500', () => Response.json({ error: 'Could not delete account. Please try again.' }, { status: 500 })],
  ['Auth 500', () => Response.json({ error: 'Account deletion could not be completed. Please contact support.' }, { status: 500 })],
  ['generic 500', () => Response.json({ error: 'Internal server error' }, { status: 500 })],
  ...[400, 401, 403, 404, 502, 503].map((status): [string, () => Response] =>
    [`unknown ${status}`, () => Response.json({ error: 'private raw detail try again' }, { status })]),
  ...rejections.map(([status, error]): [string, () => Response] =>
    [`mismatched ${error}`, () => Response.json({ error }, { status: status === 401 ? 400 : 401 })]),
  ['invented stage', () => Response.json({ error: 'fixture', stage: 'authentication', retryable: true }, { status: 401 })],
  ['extra fields cannot establish rejection', () => Response.json({ error: 'Authentication required', ok: false }, { status: 401 })],
  ...[201, 202, 206, 400, 401, 500].map((status): [string, () => Response] =>
    [`positive flags ${status}`, () => Response.json({ ok: true, deleted: true }, { status })]),
  ...[null, [], 'private raw detail', 1, true, {}, { ok: true }, { deleted: true },
    { ok: 'true', deleted: true }, { ok: true, deleted: 'true' }, { ok: 1, deleted: true },
    { ok: true, deleted: false }, { ok: false, deleted: true },
    { ok: true, deleted: true, error: 'contradiction' }, { ok: true, deleted: true, error: null },
  ].map((body): [string, () => Response] => [`envelope ${JSON.stringify(body)}`, () => Response.json(body)]),
  ['204', () => new Response(null, { status: 204 })],
  ['malformed', () => new Response('{"ok":', { headers: { 'content-type': 'application/json' } })],
  ['empty', () => new Response('', { headers: { 'content-type': 'application/json' } })],
  ['non JSON positive body', () => new Response('{"ok":true,"deleted":true}')],
  ...[404, 502].map((status): [string, () => Response] =>
    [`HTML ${status}`, () => new Response('<html>private raw detail</html>', { status })]),
  ['interrupted JSON', () => new Response(new ReadableStream({
    start(controller) { controller.error(new Error('private raw stream detail')) },
  }), { headers: { 'content-type': 'application/json' } })],
  ['network', () => { throw new TypeError('private raw network detail') }],
  ['abort', () => { throw new DOMException('private raw abort detail', 'AbortError') }],
  ['timeout', () => { throw new DOMException('private raw timeout detail', 'TimeoutError') }],
]

for (const [name, fixture] of ambiguous) {
  test(`${name} is unconfirmed, never retryable and never raw/partial/failure`, async () => {
    let calls = 0
    await assert.rejects(() => requestAccountDeletion('fixture-secret', (async () => {
      calls++
      return fixture()
    }) as typeof fetch), (err: unknown) => {
      assert.ok(err instanceof AccountDeletionUnconfirmedError)
      assert.equal(err.retryable, false)
      assert.match(err.message, /Some data may already have been removed/)
      assert.match(err.message, /contact support before making another request/)
      assert.doesNotMatch(err.message, /try again|did not complete|partial|private raw/i)
      assert.equal(err.evidence?.classification, 'unconfirmed')
      assert.doesNotMatch(JSON.stringify(err.evidence), /fixture-secret|private raw|try again/)
      return true
    })
    assert.equal(calls, 1)
  })
}

test('support evidence is bounded and allowlisted; missing release never invalidates success', async () => {
  for (const release of ['unbuilt', `sha256:${'a'.repeat(64)}`, 'private arbitrary identity', 'x'.repeat(500)]) {
    const before = Date.now()
    await assert.rejects(() => requestAccountDeletion('secret', (async () => Response.json({
      error: 'private text', ok: null, deleted: [], identity: 'private identity',
      stage: 'auth_deletion', partialCompletion: true,
    }, { status: 500, headers: { 'X-API-Release': release, 'X-Request-ID': 'private identity' } })) as typeof fetch),
    (err: unknown) => {
      assert.ok(err instanceof AccountDeletionApiError)
      const evidence = err.evidence!
      assert.ok(Date.parse(evidence.requestedAtUtc) >= before)
      assert.ok(evidence.requestedAtUtc.endsWith('Z'))
      assert.deepEqual(evidence.fields, { ok: 'null', deleted: 'array', error: 'string' })
      assert.equal(evidence.destination, 'https://api.postround.test')
      assert.equal(evidence.method, 'POST')
      assert.equal(evidence.path, '/api/account/delete')
      assert.equal(evidence.release, release.startsWith('sha256:') || release === 'unbuilt' ? release : undefined)
      assert.doesNotMatch(JSON.stringify(evidence), /private|identity|stage|partialCompletion|secret/)
      return true
    })
  }
  await requestAccountDeletion('fixture', (async () => Response.json({
    ok: true, deleted: true, stage: 'ignored', retryable: true,
  })) as typeof fetch)
})
