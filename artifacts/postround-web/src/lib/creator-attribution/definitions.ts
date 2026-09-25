export type Filters = {
  search: string
  creator: string | null
  start: string | null
  end: string | null
  platform: string | null
  method: string | null
  status: string | null
  state: string | null
  page: number
}
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const date = /^\d{4}-\d{2}-\d{2}$/
export const PAGE_SIZE = 20
export function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const get = (key: string) => typeof params[key] === 'string' ? (params[key] as string).trim() : ''
  const day = (key: string) => date.test(get(key)) && !Number.isNaN(Date.parse(get(key))) ? get(key) : null
  const oneOf = (key: string, values: string[]) => values.includes(get(key)) ? get(key) : null
  return {
    search: get('search').slice(0, 80).replace(/[%(),.*\\]/g, ''),
    creator: uuid.test(get('creator')) ? get('creator') : null,
    start: day('start'),
    end: day('end'),
    platform: oneOf('platform', ['web', 'android', 'ios', 'unknown']),
    method: oneOf('method', ['web_referral', 'android_install_referrer']),
    status: oneOf('status', ['active', 'trialing', 'past_due', 'canceled', 'inactive', 'none']),
    state: oneOf('state', ['claimed', 'unclaimed']),
    page: Math.min(10000, Math.max(1, Number.isSafeInteger(Number(get('page'))) ? Number(get('page')) : 1)),
  }
}
export class SourceFailure extends Error {
  kind: 'missing' | 'access' | 'query'
  constructor(kind: 'missing' | 'access' | 'query', message: string) { super(message); this.kind = kind }
}
export function checked<T extends { error: { code?: string; message: string } | null }>(result: T): T {
  if (result.error) {
    const { code } = result.error
    if (code === '42P01' || code === 'PGRST205' || code === '42703' || code === 'PGRST204' || code === 'PGRST200') {
      throw new SourceFailure('missing', 'Referral tables or expected columns are not available in this Supabase project. Verify the migration rollout.')
    }
    if (code === '42501') throw new SourceFailure('access', 'Referral data access was denied by Supabase.')
    throw new SourceFailure('query', 'Referral data could not be loaded. Please retry or check the server logs.')
  }
  return result
}
export function total(result: { count: number | null; error: { code?: string; message: string } | null }) {
  checked(result)
  if (result.count === null) throw new SourceFailure('query', 'The referral count was not returned by Supabase.')
  return result.count
}
export function nextDay(day: string) {
  const value = new Date(`${day}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString()
}