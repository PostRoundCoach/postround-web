export class AccountDeletionConfigurationError extends Error {
  constructor() {
    super('Account deletion is not available.')
    this.name = 'AccountDeletionConfigurationError'
  }
}

export const UNCONFIRMED_MESSAGE = 'We could not confirm the account deletion outcome. Some data may already have been removed. Please contact support before making another request.'

export type DeletionEvidence = {
  requestedAtUtc: string
  method: 'POST'
  path: '/api/account/delete'
  destination: string
  status: number
  release?: string
  envelope: 'unreadable' | 'object' | 'array' | 'null' | 'string' | 'number' | 'boolean'
  fields?: Partial<Record<'ok' | 'deleted' | 'error', string>>
  classification: 'unconfirmed' | 'confirmed' | 'authentication_rejected' | 'confirmation_rejected'
}

export class AccountDeletionApiError extends Error {
  readonly status: number
  readonly retryable: boolean
  readonly evidence?: DeletionEvidence

  constructor(
    status: number,
    message = UNCONFIRMED_MESSAGE,
    retryable = false,
    evidence?: DeletionEvidence,
  ) {
    super(message)
    this.name = 'AccountDeletionApiError'
    this.status = status
    this.retryable = retryable
    this.evidence = evidence
  }
}

export class AccountDeletionUnconfirmedError extends AccountDeletionApiError {
  constructor(status = 0, evidence?: DeletionEvidence) {
    super(status, UNCONFIRMED_MESSAGE, false, evidence)
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
  const evidence: DeletionEvidence = {
    requestedAtUtc: new Date().toISOString(),
    method: 'POST',
    path: '/api/account/delete',
    destination: new URL(url).origin,
    status: 0,
    envelope: 'unreadable',
    classification: 'unconfirmed',
  }
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'omit',
      redirect: 'error',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    })
  } catch {
    // A lost response is not evidence that the server did (or did not) delete.
    throw new AccountDeletionUnconfirmedError(0, evidence)
  }

  evidence.status = response.status
  const release = response.headers.get('X-API-Release')
  // Only the documented release formats; never retain arbitrary header text.
  if (release === 'unbuilt' || (release && /^sha256:[a-f0-9]{64}$/.test(release))) {
    evidence.release = release
  }
  let payload: unknown
  try {
    if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      throw new Error('Unexpected response type')
    }
    payload = await response.json()
  } catch {
    throw new AccountDeletionUnconfirmedError(response.status, evidence)
  }
  evidence.envelope = payload === null ? 'null' : Array.isArray(payload) ? 'array' : typeof payload as DeletionEvidence['envelope']
  const result = typeof payload === 'object' && payload !== null && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
  if (result) {
    evidence.fields = {}
    for (const key of ['ok', 'deleted', 'error'] as const) {
      if (Object.hasOwn(result, key)) {
        evidence.fields[key] = result[key] === null ? 'null' : Array.isArray(result[key]) ? 'array' : typeof result[key]
      }
    }
  }
  if (response.status === 200 && result?.ok === true && result.deleted === true && !('error' in result)) {
    return { ok: true, deleted: true }
  }
  // Current rejection envelopes contain only error. Extra fields cannot establish
  // provenance or override contradictory flags. Internal stage/retry fields are
  // not a public outcome contract.
  if (result && Object.keys(result).length === 1 && typeof result.error === 'string') {
    const authRejected = response.status === 401 && [
      'Authentication required', 'Invalid or expired session', 'Could not verify session',
    ].includes(result.error)
    const confirmationRejected = response.status === 400 && result.error === 'Confirmation must be "DELETE"'
    if (authRejected || confirmationRejected) {
      evidence.classification = authRejected ? 'authentication_rejected' : 'confirmation_rejected'
      throw new AccountDeletionApiError(response.status,
        authRejected
          ? 'This deletion request was rejected because the API could not authorize the session. This does not establish the outcome of any earlier request. Contact support for help.'
          : 'This deletion request was rejected because the API did not accept the confirmation. This does not establish the outcome of any earlier request. Contact support for help.',
        false, evidence)
    }
  }
  throw new AccountDeletionUnconfirmedError(response.status, evidence)
}