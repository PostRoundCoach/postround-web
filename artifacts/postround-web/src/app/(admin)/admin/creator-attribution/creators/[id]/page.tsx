import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin, referralService, creatorDetail, message, parseFilters } from '@/lib/creator-attribution/read-model'
import { Definition, FilterForm, Metrics, Notice, Pager, Panel, dateTime, profileOf, short } from '@/components/admin/AttributionUI'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Creator referrals | Post Round Coach Admin' }
export default async function CreatorPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const raw = await searchParams
  const filters = parseFilters(raw)
  await requireAdmin()
  let data: Awaited<ReturnType<typeof creatorDetail>> = null
  let error: string | null = null
  try { data = await creatorDetail(await referralService(), id, filters) }
  catch (cause) { console.error('[Creator attribution] creator unavailable', cause); error = message(cause) }
  if (!error && !data) notFound()
  return <div className="p-5 lg:p-8 max-w-7xl mx-auto space-y-6">
    <Link className="text-[#52B788] underline text-sm" href="/admin/creator-attribution">← All creators</Link>
    <h1 className="font-serif text-3xl font-bold">{data?.creator.display_name ?? 'Creator referrals'}</h1>
    {error ? <Notice>{error} Counts are unavailable, not zero.</Notice> : data && <>
      <Panel title="Creator identity">
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><dt className="text-muted-foreground">Creator ID</dt><dd>{short(data.creator.id)}</dd></div>
          <div><dt className="text-muted-foreground">Owner account ID (not creator identity)</dt><dd>{short(data.creator.user_id)}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd>{data.creator.status}</dd></div>
          <div><dt className="text-muted-foreground">Slug / referral path</dt><dd>{data.creator.slug && data.link && data.creator.status === 'active'
            ? <a className="text-[#52B788] underline" href={`/r/${data.creator.slug}`}>/r/{data.creator.slug}</a>
            : data.creator.slug && data.link ? `/r/${data.creator.slug} (inactive; public link unavailable)`
            : data.creator.slug ? `${data.creator.slug} (no issued link)` : 'No slug'}</dd></div>
          <div><dt className="text-muted-foreground">Stable link ID</dt><dd>{short(data.link?.id)}</dd></div>
          <div><dt className="text-muted-foreground">Link created</dt><dd>{dateTime(data.link?.created_at)}</dd></div>
          <div><dt className="text-muted-foreground">First click event</dt><dd>{dateTime(data.first)}</dd></div>
          <div><dt className="text-muted-foreground">Latest click event</dt><dd>{dateTime(data.latest)}</dd></div>
        </dl>
      </Panel>
      <Metrics items={[
        { label: 'Click events (all time)', value: data.counts.events },
        { label: 'Attributed players (all time)', value: data.counts.players },
        { label: 'Active subscribers (current)', value: data.counts.subscribers },
        { label: 'Compensation', value: 'Not configured' },
      ]} />
      <Definition />
      <Panel title="Activity and claims"><FilterForm filters={filters} creatorId={id} /><p className="text-xs text-muted-foreground">Dates apply to click time in events and original claim time in attributions. Each list is paginated separately with the same page number; counts below are filtered, metrics above are all-time.</p></Panel>
      <Panel title={`Click events · ${data.events.count} matching`}>
        {!data.events.rows.length ? <p className="text-sm text-muted-foreground">No click events match these filters.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr>{['Event ID','Occurred','Platform','Campaign','State'].map(x => <th className="pb-3 pr-3" key={x}>{x}</th>)}</tr></thead>
            <tbody>{data.events.rows.map(row => <tr key={row.id} className="border-t border-border">
              <td className="py-3 pr-3">{short(row.id)}</td><td className="pr-3">{dateTime(row.occurred_at)}</td><td className="pr-3">{row.platform}</td><td className="pr-3">{row.campaign}</td><td>{row.creator_attributions.length ? 'Claimed' : 'Unclaimed (click only)'}</td>
            </tr>)}</tbody></table></div>}
        <Pager count={data.events.count} page={filters.page} filters={raw} base={`/admin/creator-attribution/creators/${id}`} />
      </Panel>
      <Panel title={`Original attributions · ${data.attributions.count} matching`}>
        {!data.attributions.rows.length ? <p className="text-sm text-muted-foreground">No attributed players match these filters. Clicks alone never create an attribution.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr>{['Account','Claimed','Platform / method','Subscription','Inspect'].map(x => <th className="pb-3 pr-3" key={x}>{x}</th>)}</tr></thead>
            <tbody>{data.attributions.rows.map(row => <tr key={row.id} className="border-t border-border">
              <td className="py-3 pr-3">{profileOf(row.profiles)?.display_name ?? 'Player'}<div>{short(row.user_id)}</div></td>
              <td className="pr-3">{dateTime(row.attributed_at)}</td><td className="pr-3">{row.platform} · {row.attribution_method}</td>
              <td className="pr-3">{profileOf(row.profiles)?.subscription_plan ?? 'No plan'} / {profileOf(row.profiles)?.subscription_status ?? 'No status'}</td>
              <td><Link className="text-[#52B788] underline" href={`/admin/creator-attribution/attributions/${row.id}`}>View record</Link></td>
            </tr>)}</tbody></table></div>}
        <Pager count={data.attributions.count} page={filters.page} filters={raw} base={`/admin/creator-attribution/creators/${id}`} />
      </Panel>
    </>}
  </div>
}