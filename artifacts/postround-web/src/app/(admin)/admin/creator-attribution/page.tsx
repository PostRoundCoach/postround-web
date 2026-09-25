import Link from 'next/link'
import { requireAdmin, referralService, creatorRows, message, overview, parseFilters } from '@/lib/creator-attribution/read-model'
import { Definition, FilterForm, Metrics, Notice, Pager, Panel, dateTime, short } from '@/components/admin/AttributionUI'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Creator Attribution | Post Round Coach Admin' }
export default async function AttributionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams
  const filters = parseFilters(raw)
  await requireAdmin()
  let data: Awaited<ReturnType<typeof overview>> | null = null
  let creators: Awaited<ReturnType<typeof creatorRows>> | null = null
  let error: string | null = null
  try {
    const service = await referralService()
    ;[data, creators] = await Promise.all([overview(service), creatorRows(service, filters)])
  } catch (cause) { console.error('[Creator attribution] overview unavailable', cause); error = message(cause) }
  return <div className="p-5 lg:p-8 max-w-7xl mx-auto space-y-6">
    <div><h1 className="font-serif text-3xl font-bold">Creator Attribution</h1><p className="text-muted-foreground">Read-only referral activity and original player claims</p></div>
    {error ? <Notice>{error} Counts are unavailable, not zero.</Notice> : data && creators && <>
      <Metrics items={[
        { label: 'Creators', value: data.creators }, { label: 'Issued links', value: data.links },
        { label: 'Click events', value: data.events }, { label: 'Attributed players', value: data.players },
        { label: 'Attributed subscribers', value: data.subscribers, note: 'Current profile status: active' },
        { label: 'Compensation', value: 'Not configured' },
      ]} />
      <Definition />
      <Panel title="Creators">
        <FilterForm filters={filters} />
        {!creators.rows.length ? <p className="text-sm text-muted-foreground">No creators match this search. If no filter is set, there are no creator profiles yet.</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm text-left min-w-[680px]">
            <thead className="text-muted-foreground border-b border-border"><tr>{['Creator','Status','Link','Clicks','Attributed players','Active subscribers'].map(x => <th className="py-3 pr-4" key={x}>{x}</th>)}</tr></thead>
            <tbody>{creators.rows.map(row => <tr key={row.id} className="border-b border-border/60">
              <td className="py-3 pr-4"><Link className="text-[#52B788] hover:underline font-semibold" href={`/admin/creator-attribution/creators/${row.id}`}>{row.display_name}</Link><div className="text-xs text-muted-foreground">{row.slug ?? 'No slug'} · {short(row.id)}</div></td>
              <td className="pr-4">{row.status}</td><td className="pr-4">{row.link ? <span title={row.link.id}>Issued {dateTime(row.link.created_at)}</span> : 'None'}</td>
              <td className="pr-4">{row.events}</td><td className="pr-4">{row.players}</td><td>{row.subscribers}</td>
            </tr>)}</tbody>
          </table></div>}
        <Pager count={creators.count} page={filters.page} filters={raw} base="/admin/creator-attribution" />
      </Panel>
    </>}
  </div>
}