import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AccountDeletionApiError,
  AccountDeletionConfigurationError,
  AccountDeletionUnconfirmedError,
  requestAccountDeletion,
} from './client.ts'

test('deletion targets the configured authoritative API origin with the bearer identity', async () => {
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test/'
  let request: { url: string; init?: RequestInit } | undefined
  try {
    const result = await requestAccountDeletion(
      'session-token',
      (async (url, init) => {
        request = { url: String(url), init }
        return Response.json({ ok: true, deleted: true })
      }) as typeof fetch,
    )
    assert.deepEqual(result, { ok: true, deleted: true })
    assert.equal(request?.url, 'https://api.postround.test/api/account/delete')
    assert.equal(request?.init?.method, 'POST')
    assert.equal(
      new Headers(request?.init?.headers).get('authorization'),
      'Bearer session-token',
    )
    assert.deepEqual(JSON.parse(String(request?.init?.body)), {
      confirmation: 'DELETE',
    })
  } finally {
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('deletion fails visibly instead of falling back to the Next.js site', async () => {
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  try {
    await assert.rejects(
      () => requestAccountDeletion('session-token'),
      AccountDeletionConfigurationError,
    )
  } finally {
    if (originalApiBase !== undefined) {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('deletion preserves safe API errors and never treats malformed success as complete', async () => {
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  try {
    await assert.rejects(
      () => requestAccountDeletion(
        'session-token',
        (async () => Response.json({
          error: 'Account deletion could not be completed. No success was recorded.',
          retryable: true,
        }, { status: 500 })) as typeof fetch,
      ),
      (error: unknown) => error instanceof AccountDeletionApiError
        && error.status === 500
        && !error.retryable
        && error.message.includes('Some data may already have been removed'),
    )
    await assert.rejects(
      () => requestAccountDeletion(
        'session-token',
        (async () => Response.json({ ok: true })) as typeof fetch,
      ),
      AccountDeletionApiError,
    )
  } finally {
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('unexpected, contradictory, empty, malformed and interrupted responses never confirm deletion or retry', async () => {
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const fixtures = [
    () => new Response(null, { status: 204 }),
    () => new Response('not json'),
    () => Response.json(null),
    () => Response.json([]),
    () => Response.json({}),
    () => Response.json({ ok: true }),
    () => Response.json({ deleted: true }),
    () => Response.json({ ok: 'true', deleted: true }),
    () => Response.json({ ok: true, deleted: false }),
    () => Response.json({ ok: true, deleted: true, error: 'contradiction' }),
    () => Response.json({ ok: true, deleted: true }, { status: 500 }),
    () => Response.json({}, { status: 502 }),
    () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"ok":true,'))
        controller.error(new Error('fixture stream interrupted'))
      },
    })),
    () => { throw new TypeError('fixture network failure') },
  ]
  try {
    for (const fixture of fixtures) {
      let calls = 0
      await assert.rejects(() => requestAccountDeletion('fixture-token', (async () => {
        calls++
        return fixture()
      }) as typeof fetch), (error: unknown) => {
        assert.ok(error instanceof AccountDeletionUnconfirmedError)
        assert.equal(error.retryable, false)
        assert.match(error.message, /may already have been deleted/)
        return true
      })
      assert.equal(calls, 1)
    }
  } finally {
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('failed API stages never confirm success or echo untrusted public error text', async () => {
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  try {
    for (const [stage, status] of [
      ['authentication', 401], ['confirmation', 400],
      ['application_cleanup', 503], ['auth_identity', 500], ['unknown', 500],
    ] as const) {
      let calls = 0
      await assert.rejects(() => requestAccountDeletion('fixture-token', (async () => {
        calls++
        return Response.json({ error: 'untrusted fixture detail', stage, retryable: true }, { status })
      }) as typeof fetch), (error: unknown) => {
        assert.ok(error instanceof AccountDeletionApiError)
        assert.equal(error.status, status)
        assert.equal(error.retryable, false)
        assert.ok(!error.message.includes('untrusted'))
        if (stage === 'auth_identity' || stage === 'application_cleanup') {
          assert.match(error.message, /Some data may already have been removed/)
        }
        return true
      })
      assert.equal(calls, 1)
    }
  } finally {
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})