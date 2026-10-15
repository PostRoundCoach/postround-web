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
    message = 'Account deletion did not complete. Some data may already have been removed. Please contact support before making another request.',
    retryable = false,
  ) {
    super(message)
    this.name = 'AccountDeletionApiError'
    this.status = status
    this.retryable = retryable
  }
}

export class AccountDeletionUnconfirmedError extends AccountDeletionApiError {
  constructor(status = 0) {
    super(status, 'We could not confirm the account deletion outcome. Your account may already have been deleted. Please contact support before making another request.', false)
    this.name = 'AccountDeletionUnconfirmedError'
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
  const url = `${accountApiBase()}/api/account/delete`
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    })
  } catch {
    // A lost response is not evidence that the server did (or did not) delete.
    throw new AccountDeletionUnconfirmedError()
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new AccountDeletionUnconfirmedError(response.status)
  }
  const result = typeof payload === 'object' && payload !== null
    ? payload as Record<string, unknown>
    : null

  if (!response.ok) {
    if (result?.ok === true || result?.deleted === true || typeof result?.error !== 'string') {
      throw new AccountDeletionUnconfirmedError(response.status)
    }
    throw new AccountDeletionApiError(
      response.status,
      result.stage === 'authentication'
        ? 'Account deletion was not authorized. Please contact support if you need help accessing your account.'
        : result.stage === 'confirmation'
        ? 'Account deletion was not submitted: the API rejected the confirmation.'
        : undefined,
      false,
    )
  }
  if (result?.ok !== true || result.deleted !== true || 'error' in result) {
    throw new AccountDeletionUnconfirmedError(response.status)
  }
  return { ok: true, deleted: true }
}