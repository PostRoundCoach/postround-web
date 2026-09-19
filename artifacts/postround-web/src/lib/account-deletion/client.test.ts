import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AccountDeletionApiError,
  AccountDeletionConfigurationError,
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
        && error.retryable,
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