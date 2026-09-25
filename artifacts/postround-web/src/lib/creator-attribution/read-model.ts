import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { checked, nextDay, PAGE_SIZE, SourceFailure, total, uuid, type Filters } from './definitions'
export { parseFilters } from './definitions'

export async function requireAdmin() {
  noStore()
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) redirect('/login')
  if (user.app_metadata?.role !== 'admin') redirect('/dashboard?error=admin_required')
}
export type Service = ReturnType<typeof createServiceClient>
export async function referralService(): Promise<Service> {
  const service = createServiceClient()
  // A configured key alone is not sufficient: anon credentials can make RLS
  // return an empty dataset indistinguishable from a legitimate zero.
  const { error } = await service.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (error) throw new SourceFailure('access', 'Referral service access is unavailable or lacks admin privileges.')
  return service
}

export function message(error: unknown) {
  if (error instanceof SourceFailure) return error.message
  if (error instanceof Error && error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) return 'Service access is not configured (SUPABASE_SERVICE_ROLE_KEY is required).'
  return 'Referral data is unavailable. Please retry or check server configuration.'
}

// Original attributions have a unique user_id. An active subscription status is
// a current profile state, not purchase, qualifying revenue, or payable compensation.
export function subscriberQuery(service: Service) {
  return service.from('creator_attributions').select('id,profiles!inner(id)', { count: 'exact', head: true })
    .eq('profiles.subscription_status', 'active')
}

export async function overview(service: Service) {
  const [creators, links, events, players, subscribers] = await Promise.all([
    service.from('creator_profiles').select('id', { count: 'exact', head: true }),
    service.from('creator_referral_links').select('id', { count: 'exact', head: true }),
    service.from('creator_referral_events').select('id', { count: 'exact', head: true }),
    service.from('creator_attributions').select('id', { count: 'exact', head: true }),
    subscriberQuery(service),
  ])
  return { creators: total(creators), links: total(links), events: total(events), players: total(players), subscribers: total(subscribers) }
}
export async function creatorRows(service: Service, filters: Filters) {
  let matchingLinkCreator: string | null = null
  if (uuid.test(filters.search)) {
    matchingLinkCreator = checked(await service.from('creator_referral_links')
      .select('creator_id').eq('id', filters.search).maybeSingle()).data?.creator_id ?? null
  }
  let query = service.from('creator_profiles')
    .select('id,user_id,display_name,slug,status,created_at', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id')
  if (filters.search) {
    query = uuid.test(filters.search)
      ? query.or(`id.eq.${filters.search},user_id.eq.${filters.search}${matchingLinkCreator ? `,id.eq.${matchingLinkCreator}` : ''}`)
      : query.or(`display_name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`)
  }
  if (filters.creator) query = query.eq('id', filters.creator)
  const result = checked(await query.range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1))
  const rows = await Promise.all((result.data ?? []).map(async creator => {
    const linkResult = checked(await service.from('creator_referral_links').select('id,created_at').eq('creator_id', creator.id).maybeSingle())
    const link = linkResult.data
    if (!link) return { ...creator, link: null, events: 0, players: 0, subscribers: 0 }
    const [events, players, subscribers] = await Promise.all([
      service.from('creator_referral_events').select('id', { count: 'exact', head: true }).eq('referral_link_id', link.id),
      service.from('creator_attributions').select('id', { count: 'exact', head: true }).eq('creator_id', creator.id),
      subscriberQuery(service).eq('creator_id', creator.id),
    ])
    return { ...creator, link, events: total(events), players: total(players), subscribers: total(subscribers) }
  }))
  if (result.count === null) throw new SourceFailure('query', 'Creator count was not returned by Supabase.')
  return { rows, count: result.count }
}

export async function creatorDetail(service: Service, id: string, filters: Filters) {
  if (!uuid.test(id)) return null
  const creator = checked(await service.from('creator_profiles')
    .select('id,user_id,display_name,slug,status,created_at')
    .eq('id', id).maybeSingle()).data
  if (!creator) return null
  const link = checked(await service.from('creator_referral_links').select('id,created_at').eq('creator_id', id).maybeSingle()).data
  if (!link) return { creator, link: null, first: null, latest: null, events: { rows: [], count: 0 }, attributions: { rows: [], count: 0 }, counts: { events: 0, players: 0, subscribers: 0 } }
  const [firstResult, latestResult, eventCount, playerCount, subscriberCount] = await Promise.all([
    service.from('creator_referral_events').select('occurred_at').eq('referral_link_id', link.id).order('occurred_at').limit(1),
    service.from('creator_referral_events').select('occurred_at').eq('referral_link_id', link.id).order('occurred_at', { ascending: false }).limit(1),
    service.from('creator_referral_events').select('id', { count: 'exact', head: true }).eq('referral_link_id', link.id),
    service.from('creator_attributions').select('id', { count: 'exact', head: true }).eq('creator_id', id),
    subscriberQuery(service).eq('creator_id', id),
  ])
  const first = checked(firstResult).data?.[0]?.occurred_at ?? null
  const latest = checked(latestResult).data?.[0]?.occurred_at ?? null
  let eventQuery = service.from('creator_referral_events')
    .select('id,referral_link_id,platform,campaign,occurred_at,expires_at,creator_attributions(id)', { count: 'exact' })
    .eq('referral_link_id', link.id)
    .order('occurred_at', { ascending: false })
  if (filters.start) eventQuery = eventQuery.gte('occurred_at', `${filters.start}T00:00:00Z`)
  if (filters.end) eventQuery = eventQuery.lt('occurred_at', nextDay(filters.end))
  if (filters.platform) eventQuery = eventQuery.eq('platform', filters.platform)
  if (filters.state) eventQuery = eventQuery.filter('creator_attributions', filters.state === 'claimed' ? 'not.is' : 'is', 'null')
  if (filters.search && uuid.test(filters.search)) eventQuery = eventQuery.eq('id', filters.search)
  const er = checked(await eventQuery.range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1))
  let attributionQuery = service.from('creator_attributions')
    .select('id,user_id,creator_id,referral_link_id,referral_event_id,platform,attribution_method,attribution_source,campaign,attributed_at,profiles!inner(id,display_name,subscription_plan,subscription_status)', { count: 'exact' })
    .eq('creator_id', id).order('attributed_at', { ascending: false })
  if (filters.start) attributionQuery = attributionQuery.gte('attributed_at', `${filters.start}T00:00:00Z`)
  if (filters.end) attributionQuery = attributionQuery.lt('attributed_at', nextDay(filters.end))
  if (filters.platform) attributionQuery = attributionQuery.eq('platform', filters.platform)
  if (filters.method) attributionQuery = attributionQuery.eq('attribution_method', filters.method)
  if (filters.status) {
    attributionQuery = filters.status === 'none'
      ? attributionQuery.is('profiles.subscription_status', null)
      : attributionQuery.eq('profiles.subscription_status', filters.status)
  }
  if (filters.search && uuid.test(filters.search)) attributionQuery = attributionQuery.or(`id.eq.${filters.search},user_id.eq.${filters.search},referral_event_id.eq.${filters.search}`)
  const ar = checked(await attributionQuery.range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1))
  if (er.count === null || ar.count === null) throw new SourceFailure('query', 'A referral count was not returned by Supabase.')
  return {
    creator, link, first, latest,
    counts: { events: total(eventCount), players: total(playerCount), subscribers: total(subscriberCount) },
    events: { rows: er.data ?? [], count: er.count },
    attributions: { rows: ar.data ?? [], count: ar.count },
  }
}
export async function attributionDetail(service: Service, id: string) {
  if (!uuid.test(id)) return null
  const attribution = checked(await service.from('creator_attributions')
    .select('id,user_id,creator_id,referral_link_id,referral_event_id,platform,attribution_method,attribution_source,campaign,attributed_at,profiles(id,display_name,subscription_plan,subscription_status)')
    .eq('id', id).maybeSingle()).data
  if (!attribution) return null
  const [creator, link, event] = await Promise.all([
    service.from('creator_profiles').select('id,display_name,slug,status').eq('id', attribution.creator_id).single(),
    service.from('creator_referral_links').select('id,creator_id,created_at').eq('id', attribution.referral_link_id).single(),
    service.from('creator_referral_events').select('id,referral_link_id,platform,campaign,occurred_at,expires_at').eq('id', attribution.referral_event_id).single(),
  ])
  return { attribution, creator: checked(creator).data, link: checked(link).data, event: checked(event).data }
}