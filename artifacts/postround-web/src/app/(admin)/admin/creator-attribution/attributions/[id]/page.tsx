import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin, referralService, attributionDetail, message } from '@/lib/creator-attribution/read-model'
import { Definition, Notice, Panel, dateTime, profileOf, short } from '@/components/admin/AttributionUI'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Attribution record | Post Round Coach Admin' }
export default async function AttributionRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()
  let data: Awaited<ReturnType<typeof attributionDetail>> = null
  let error: string | null = null
  try { data = await attributionDetail(await referralService(), id) }
  catch (cause) { console.error('[Creator attribution] record unavailable', cause); error = message(cause) }
  if (!error && !data) notFound()
  const a = data?.attribution
  return <div className="p-5 lg:p-8 max-w-5xl mx-auto space-y-6">
    <Link href="/admin/creator-attribution" className="text-[#52B788] underline text-sm">← Creator Attribution</Link>
    <h1 className="font-serif text-3xl font-bold">Original attribution</h1>
    {error ? <Notice>{error} This does not mean there are no records.</Notice> : data && a && <>
      <Definition />
      <Panel title="Claim record"><dl className="grid gap-4 sm:grid-cols-2 text-sm">
        <div><dt className="text-muted-foreground">Attribution ID</dt><dd>{short(a.id)}</dd></div>
        <div><dt className="text-muted-foreground">Claimed at</dt><dd>{dateTime(a.attributed_at)}</dd></div>
        <div><dt className="text-muted-foreground">Account ID</dt><dd>{short(a.user_id)}</dd></div>
        <div><dt className="text-muted-foreground">Player</dt><dd>{profileOf(a.profiles)?.display_name ?? 'No display name'}</dd></div>
        <div><dt className="text-muted-foreground">Creator ID</dt><dd><Link className="text-[#52B788] underline" href={`/admin/creator-attribution/creators/${a.creator_id}`}>{short(a.creator_id)}</Link></dd></div>
        <div><dt className="text-muted-foreground">Creator</dt><dd>{data.creator?.display_name ?? 'Unavailable'} · {data.creator?.status ?? 'Unknown'} · {data.creator?.slug ?? 'No slug'}</dd></div>
        <div><dt className="text-muted-foreground">Link ID</dt><dd>{short(a.referral_link_id)} · created {dateTime(data.link?.created_at)}</dd></div>
        <div><dt className="text-muted-foreground">Event ID (claim evidence; admin only)</dt><dd>{short(a.referral_event_id)}</dd></div>
        <div><dt className="text-muted-foreground">Event time / expiry</dt><dd>{dateTime(data.event?.occurred_at)} / {dateTime(data.event?.expires_at)}</dd></div>
        <div><dt className="text-muted-foreground">Event platform / campaign</dt><dd>{data.event?.platform ?? '—'} / {data.event?.campaign ?? '—'}</dd></div>
        <div><dt className="text-muted-foreground">Claim platform / method / source</dt><dd>{a.platform} / {a.attribution_method} / {a.attribution_source}</dd></div>
        <div><dt className="text-muted-foreground">Claim campaign</dt><dd>{a.campaign}</dd></div>
        <div><dt className="text-muted-foreground">Current plan / status</dt><dd>{profileOf(a.profiles)?.subscription_plan ?? 'No plan'} / {profileOf(a.profiles)?.subscription_status ?? 'No status'}</dd></div>
      </dl></Panel>
    </>}
  </div>
}