import Link from 'next/link'
import type { Filters } from '@/lib/creator-attribution/definitions'

export const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '—'
export const short = (id: string | null | undefined) => id ? <span className="font-mono text-xs break-all">{id}</span> : '—'
export function profileOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}
export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5 space-y-4"><h2 className="font-serif text-xl font-semibold">{title}</h2>{children}</section>
}
export function Metrics({ items }: { items: { label: string; value: number | string; note?: string }[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(item =>
    <div key={item.label} className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{item.label}</p>
      <p className="font-serif text-2xl font-bold mt-2">{item.value}</p>
      {item.note && <p className="text-xs text-muted-foreground mt-2">{item.note}</p>}
    </div>
  )}</div>
}
export function Notice({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4 text-sm">{children}</div>
}
export function Pager({ count, page, filters, base }: { count: number; page: number; filters: Record<string, string | string[] | undefined>; base: string }) {
  const href = (p: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (typeof value === 'string' && key !== 'page') params.set(key, value)
    params.set('page', String(p))
    return `${base}?${params}`
  }
  return <nav aria-label="Pagination" className="flex gap-4 items-center text-sm pt-3">
    {page > 1 && <Link className="text-[#52B788] underline" href={href(page - 1)}>Previous</Link>}
    <span>Page {page} · {count} matching</span>
    {page * 20 < count && <Link className="text-[#52B788] underline" href={href(page + 1)}>Next</Link>}
  </nav>
}
export function FilterForm({ filters, creatorId }: { filters: Filters; creatorId?: string }) {
  return <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
    {creatorId ? <input name="creator" type="hidden" value={creatorId} /> : <label className="grid gap-1">Search name, slug or ID<input name="search" maxLength={80} defaultValue={filters.search} placeholder="Search creators" className="rounded border border-border bg-background px-3 py-2" /></label>}
    {creatorId && <label className="grid gap-1">Search event, player or claim ID<input name="search" maxLength={80} defaultValue={filters.search} className="rounded border border-border bg-background px-3 py-2" /></label>}
    {creatorId && <>
      <label className="grid gap-1">From (event / attribution date)<input name="start" type="date" defaultValue={filters.start ?? ''} className="rounded border border-border bg-background px-3 py-2" /></label>
      <label className="grid gap-1">Through (inclusive)<input name="end" type="date" defaultValue={filters.end ?? ''} className="rounded border border-border bg-background px-3 py-2" /></label>
      <label className="grid gap-1">Event state<select name="state" defaultValue={filters.state ?? ''} className="rounded border border-border bg-background px-3 py-2"><option value="">All</option><option value="claimed">Claimed</option><option value="unclaimed">Unclaimed</option></select></label>
      <label className="grid gap-1">Platform<select name="platform" defaultValue={filters.platform ?? ''} className="rounded border border-border bg-background px-3 py-2"><option value="">All</option>{['web','android','ios','unknown'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="grid gap-1">Claim method<select name="method" defaultValue={filters.method ?? ''} className="rounded border border-border bg-background px-3 py-2"><option value="">All</option><option value="web_referral">Web referral</option><option value="android_install_referrer">Android install referrer</option></select></label>
      <label className="grid gap-1">Subscription status<select name="status" defaultValue={filters.status ?? ''} className="rounded border border-border bg-background px-3 py-2"><option value="">All</option>{['active','trialing','past_due','canceled','inactive','none'].map(x => <option key={x} value={x}>{x === 'none' ? 'No status' : x}</option>)}</select></label>
    </>}
    <button className="rounded bg-[#1B5E35] text-white px-4 py-2" type="submit">Apply</button>
  </form>
}
export function Definition() {
  return <p className="text-sm text-muted-foreground">Events are recorded clicks, not players or installs. Attributed players are original claims (one per account). Attributed subscribers are claimed accounts whose current profile subscription status is active; this does not prove a purchase or amount owed. Compensation: <strong>Not configured</strong>.</p>
}