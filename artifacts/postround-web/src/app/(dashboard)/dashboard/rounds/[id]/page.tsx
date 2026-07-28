import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Flag, Circle, CheckCircle2, XCircle } from 'lucide-react'

interface Hole {
  id: string
  hole_number: number
  par: number | null
  score: number | null
  fairway_result: string | null
  gir_result: string | null
  putts: number | null
  chip_count: number | null
  bunker_shot: boolean | null
  sand_save: boolean | null
  scramble_opportunity: boolean | null
  scramble_success: boolean | null
  penalty_strokes: number | null
  distance_to_pin_yards: number | null
  player_notes: string | null
  ai_feedback: string | null
}

interface Round {
  id: string
  course_name: string | null
  tees: string | null
  played_at: string
  course_par: number | null
  course_rating: number | null
  slope_rating: number | null
  total_score: number | null
  front_9: number | null
  back_9: number | null
  total_putts: number | null
  birdies: number | null
  pars: number | null
  bogeys: number | null
  double_bogeys: number | null
  fairways_hit: number | null
  total_fairways: number | null
  gir_hit: number | null
  total_gir: number | null
  successful_scrambles: number | null
  scrambling_opportunities: number | null
  ai_summary: string | null
  player_notes: string | null
}

function scoreToPar(score: number | null, par: number | null): { label: string; classes: string } {
  if (score == null || par == null) return { label: '—', classes: 'text-muted-foreground' }
  const diff = score - par
  if (score === 1) return { label: 'Ace', classes: 'bg-yellow-400 text-black font-bold rounded px-1' }
  if (diff <= -2) return { label: `${score}`, classes: 'bg-yellow-400 text-black font-bold rounded-full w-7 h-7 flex items-center justify-center mx-auto ring-2 ring-yellow-400' }
  if (diff === -1) return { label: `${score}`, classes: 'bg-[#52B788] text-white font-bold rounded-full w-7 h-7 flex items-center justify-center mx-auto' }
  if (diff === 0)  return { label: `${score}`, classes: 'text-[#D4AF37] font-semibold' }
  if (diff === 1)  return { label: `${score}`, classes: 'border border-border rounded w-7 h-7 flex items-center justify-center mx-auto text-muted-foreground' }
  if (diff === 2)  return { label: `${score}`, classes: 'border-2 border-border rounded w-7 h-7 flex items-center justify-center mx-auto text-muted-foreground' }
  return { label: `${score}`, classes: 'border-2 border-red-700 rounded w-7 h-7 flex items-center justify-center mx-auto text-red-400 font-bold' }
}

function fairwayDot(result: string | null, par: number | null) {
  if (par === 3 || result === 'none' || result == null) return <span className="text-muted-foreground/30">—</span>
  if (result === 'hit') return <CheckCircle2 className="h-4 w-4 text-[#52B788] mx-auto" />
  return <XCircle className="h-4 w-4 text-red-400 mx-auto" />
}

function girDot(result: string | null) {
  if (result === 'none' || result == null) return <span className="text-muted-foreground/30">—</span>
  if (result === 'hit') return <CheckCircle2 className="h-4 w-4 text-[#52B788] mx-auto" />
  return <Circle className="h-4 w-4 text-muted-foreground/50 mx-auto" />
}

function pct(hit: number | null, total: number | null) {
  if (hit == null || total == null || total === 0) return '—'
  return `${Math.round((hit / total) * 100)}%`
}

export default async function RoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: round }, { data: holesData }] = await Promise.all([
    supabase
      .from('rounds')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single<Round>(),
    supabase
      .from('holes')
      .select('*')
      .eq('round_id', id)
      .order('hole_number'),
  ])

  if (!round) notFound()

  const holes: Hole[] = holesData ?? []
  const front9 = holes.filter(h => h.hole_number <= 9)
  const back9  = holes.filter(h => h.hole_number >= 10)

  const totalScoreDiff = round.total_score != null && round.course_par != null
    ? round.total_score - round.course_par : null

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/rounds"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        All rounds
      </Link>

      {/* Round header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
            {round.course_name ?? 'Unknown course'}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">
              {new Date(round.played_at).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
            {round.tees && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground">
                {round.tees}
              </span>
            )}
            {round.course_rating && round.slope_rating && (
              <span className="text-xs text-muted-foreground">
                {round.course_rating} / {round.slope_rating}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {round.total_score != null && (
            <p className="text-4xl font-bold leading-none">{round.total_score}</p>
          )}
          {totalScoreDiff != null && (
            <p className={`text-lg font-semibold mt-1 ${totalScoreDiff < 0 ? 'text-[#52B788]' : totalScoreDiff === 0 ? 'text-[#D4AF37]' : 'text-muted-foreground'}`}>
              {totalScoreDiff === 0 ? 'E' : totalScoreDiff > 0 ? `+${totalScoreDiff}` : `${totalScoreDiff}`}
            </p>
          )}
          {(round.front_9 != null || round.back_9 != null) && (
            <p className="text-sm text-muted-foreground mt-1">
              {round.front_9 ?? '—'} · {round.back_9 ?? '—'}
            </p>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBox label="Putts" value={round.total_putts?.toString() ?? '—'} />
        <StatBox label="Fairways" value={pct(round.fairways_hit, round.total_fairways)} />
        <StatBox label="GIR" value={pct(round.gir_hit, round.total_gir)} />
        <StatBox label="Scrambling" value={pct(round.successful_scrambles, round.scrambling_opportunities)} />
      </div>

      {/* Score breakdown pills */}
      {(round.birdies != null || round.pars != null || round.bogeys != null) && (
        <div className="flex gap-2 flex-wrap mb-6">
          {round.birdies != null && round.birdies > 0 && <Pill label="Birdies" value={round.birdies} color="text-[#52B788]" bg="bg-[#52B788]/10 border-[#52B788]/20" />}
          {round.pars   != null && round.pars   > 0 && <Pill label="Pars"    value={round.pars}    color="text-[#D4AF37]" bg="bg-[#D4AF37]/10 border-[#D4AF37]/20" />}
          {round.bogeys != null && round.bogeys > 0 && <Pill label="Bogeys"  value={round.bogeys}  color="text-muted-foreground" bg="bg-muted/30 border-border" />}
          {round.double_bogeys != null && round.double_bogeys > 0 && <Pill label="Doubles+" value={round.double_bogeys} color="text-red-400" bg="bg-red-950/20 border-red-900/30" />}
        </div>
      )}

      {/* Hole-by-hole scorecard */}
      {holes.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Flag className="h-5 w-5 text-[#52B788]" />
              Scorecard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <ScorecardTable holes={front9} label="Front 9" subtotal={round.front_9} />
              {back9.length > 0 && (
                <ScorecardTable holes={back9} label="Back 9" subtotal={round.back_9} />
              )}
              {/* Totals row */}
              <div className="grid grid-cols-[2rem_2.5rem_repeat(5,_1fr)] text-xs font-semibold bg-muted/40 border-t-2 border-border px-3 py-2 gap-2 items-center">
                <span className="text-muted-foreground">TOT</span>
                <span className="text-center">{round.course_par ?? '—'}</span>
                <span className="text-center font-bold text-base">{round.total_score ?? '—'}</span>
                <span className="text-center">{round.total_putts ?? '—'}</span>
                <span className="text-center">{pct(round.fairways_hit, round.total_fairways)}</span>
                <span className="text-center">{pct(round.gir_hit, round.total_gir)}</span>
                <span />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-hole AI feedback */}
      {holes.some(h => h.ai_feedback) && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl">Hole Notes & AI Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {holes.filter(h => h.ai_feedback || h.player_notes).map(hole => (
              <div key={hole.id} className="border-l-2 border-[#1B5E35]/50 pl-4">
                <p className="text-xs font-semibold text-[#52B788] mb-1">
                  Hole {hole.hole_number} · Par {hole.par ?? '—'} · Score {hole.score ?? '—'}
                </p>
                {hole.player_notes && (
                  <p className="text-sm text-muted-foreground mb-1">{hole.player_notes}</p>
                )}
                {hole.ai_feedback && (
                  <p className="text-sm text-foreground">{hole.ai_feedback}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Round AI summary */}
      {round.ai_summary && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl">AI Coaching Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{round.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Player notes */}
      {round.player_notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl">Your Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{round.player_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ScorecardTable({ holes, label, subtotal }: { holes: Hole[]; label: string; subtotal: number | null | undefined }) {
  const parTotal   = holes.reduce((s, h) => s + (h.par   ?? 0), 0)
  const scoreTotal = holes.reduce((s, h) => s + (h.score ?? 0), 0)
  const puttTotal  = holes.reduce((s, h) => s + (h.putts ?? 0), 0)

  return (
    <table className="w-full text-xs border-collapse min-w-[520px]">
      <thead>
        <tr className="bg-muted/30 border-b border-border">
          <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-8">{label}</th>
          {holes.map(h => (
            <th key={h.hole_number} className="text-center px-1 py-2 font-medium text-muted-foreground w-9">
              {h.hole_number}
            </th>
          ))}
          <th className="text-center px-2 py-2 font-semibold text-muted-foreground">OUT</th>
        </tr>
      </thead>
      <tbody>
        {/* Par row */}
        <tr className="border-b border-border/50">
          <td className="px-3 py-1.5 text-muted-foreground">Par</td>
          {holes.map(h => (
            <td key={h.hole_number} className="text-center px-1 py-1.5 text-muted-foreground">
              {h.par ?? '—'}
            </td>
          ))}
          <td className="text-center px-2 py-1.5 font-semibold">{parTotal || '—'}</td>
        </tr>
        {/* Score row */}
        <tr className="border-b border-border/50">
          <td className="px-3 py-2 text-muted-foreground">Score</td>
          {holes.map(h => {
            const s = scoreToPar(h.score, h.par)
            return (
              <td key={h.hole_number} className="text-center px-1 py-1">
                <span className={s.classes}>{s.label}</span>
              </td>
            )
          })}
          <td className="text-center px-2 py-2 font-bold text-base">{subtotal ?? scoreTotal || '—'}</td>
        </tr>
        {/* Putts row */}
        <tr className="border-b border-border/50">
          <td className="px-3 py-1.5 text-muted-foreground">Putts</td>
          {holes.map(h => (
            <td key={h.hole_number} className="text-center px-1 py-1.5 text-muted-foreground">
              {h.putts ?? '—'}
            </td>
          ))}
          <td className="text-center px-2 py-1.5 font-semibold">{puttTotal || '—'}</td>
        </tr>
        {/* Fairway row */}
        <tr className="border-b border-border/50">
          <td className="px-3 py-1.5 text-muted-foreground">FWY</td>
          {holes.map(h => (
            <td key={h.hole_number} className="text-center px-1 py-1">
              {fairwayDot(h.fairway_result, h.par)}
            </td>
          ))}
          <td className="text-center px-2 py-1.5 text-muted-foreground">
            {holes.filter(h => h.fairway_result === 'hit').length || '—'}
          </td>
        </tr>
        {/* GIR row */}
        <tr>
          <td className="px-3 py-1.5 text-muted-foreground">GIR</td>
          {holes.map(h => (
            <td key={h.hole_number} className="text-center px-1 py-1">
              {girDot(h.gir_result)}
            </td>
          ))}
          <td className="text-center px-2 py-1.5 text-muted-foreground">
            {holes.filter(h => h.gir_result === 'hit').length || '—'}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function Pill({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${bg}`}>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
