export class AccountDeletionConfigurationError extends Error {
  constructor() {
    super('Account deletion is not available.')
    this.name = 'AccountDeletionConfigurationError'
  }
}

export class AccountDeletionApiError extends Error {
  readonly status: number
  readonly retryable: boolean

  constructor(
    status: number,
    message = 'Your account could not be deleted. Please try again.',
    retryable = true,
  ) {
    super(message)
    this.name = 'AccountDeletionApiError'
    this.status = status
    this.retryable = retryable
  }
}

function accountApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL?.trim()
  if (!apiBase) throw new AccountDeletionConfigurationError()

  try {
    const url = new URL(apiBase)
    const isLocalDevelopmentOrigin = (
      process.env.NODE_ENV !== 'production'
      || process.env.NEXT_PUBLIC_POSTROUND_ALLOW_LOCAL_API === 'true'
    )
      && url.protocol === 'http:'
      && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
    if (
      (url.protocol !== 'https:' && !isLocalDevelopmentOrigin)
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== '/' && url.pathname !== '')
    ) {
      throw new AccountDeletionConfigurationError()
    }
    return url.origin
  } catch (error) {
    if (error instanceof AccountDeletionConfigurationError) throw error
    throw new AccountDeletionConfigurationError()
  }
}

export async function requestAccountDeletion(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; deleted: true }> {
  const response = await fetchImpl(`${accountApiBase()}/api/account/delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'DELETE' }),
  })

  const payload: unknown = await response.json().catch(() => null)
  const result = typeof payload === 'object' && payload !== null
    ? payload as Record<string, unknown>
    : null

  if (!response.ok) {
    throw new AccountDeletionApiError(
      response.status,
      typeof result?.error === 'string' && result.error.trim()
        ? result.error
        : undefined,
      typeof result?.retryable === 'boolean' ? result.retryable : true,
    )
  }
  if (result?.ok !== true || result.deleted !== true) {
    throw new AccountDeletionApiError(500)
  }
  return { ok: true, deleted: true }
}