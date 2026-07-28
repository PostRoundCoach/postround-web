import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flag, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Round {
  id: string
  course_name: string | null
  tees: string | null
  played_at: string
  total_score: number | null
  course_par: number | null
  front_9: number | null
  back_9: number | null
  birdies: number | null
  pars: number | null
  bogeys: number | null
  double_bogeys: number | null
  total_putts: number | null
  fairways_hit: number | null
  total_fairways: number | null
  gir_hit: number | null
  total_gir: number | null
  successful_scrambles: number | null
  scrambling_opportunities: number | null
  ai_summary: string | null
  input_method: string | null
}

function pct(hit: number | null, total: number | null): string {
  if (hit == null || total == null || total === 0) return '—'
  return `${Math.round((hit / total) * 100)}%`
}

function scoreDiff(score: number | null, par: number | null) {
  if (score == null || par == null) return { label: '—', color: 'text-muted-foreground', icon: null }
  const diff = score - par
  if (diff < 0) return { label: `${diff}`, color: 'text-[#52B788]', icon: TrendingDown }
  if (diff === 0) return { label: 'E', color: 'text-[#D4AF37]', icon: Minus }
  return { label: `+${diff}`, color: 'text-muted-foreground', icon: TrendingUp }
}

export default async function RoundsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: rounds } = await supabase
    .from('rounds')
    .select(`
      id, course_name, tees, played_at,
      total_score, course_par, front_9, back_9,
      birdies, pars, bogeys, double_bogeys,
      total_putts, fairways_hit, total_fairways,
      gir_hit, total_gir,
      successful_scrambles, scrambling_opportunities,
      ai_summary, input_method
    `)
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })

  const allRounds: Round[] = rounds ?? []

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">My Rounds</h1>
        <p className="text-muted-foreground">
          {allRounds.length === 0
            ? 'No rounds logged yet'
            : `${allRounds.length} round${allRounds.length === 1 ? '' : 's'} logged`}
        </p>
      </div>

      {allRounds.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Flag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No rounds yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Log your rounds in the Post Round Coach app and they&apos;ll appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allRounds.map((round) => {
            const diff = scoreDiff(round.total_score, round.course_par)
            const DiffIcon = diff.icon
            return (
              <Link key={round.id} href={`/dashboard/rounds/${round.id}`} className="block group">
                <Card className="overflow-hidden transition-colors hover:border-[#1B5E35]/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="font-serif text-lg leading-tight truncate group-hover:text-[#52B788] transition-colors">
                            {round.course_name ?? 'Unknown course'}
                          </CardTitle>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-[#52B788] transition-colors" />
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm text-muted-foreground">
                            {new Date(round.played_at).toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                          {round.tees && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground">
                              {round.tees}
                            </span>
                          )}
                          {round.input_method && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground capitalize">
                              {round.input_method.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {round.total_score != null && (
                          <p className="text-3xl font-bold leading-none">{round.total_score}</p>
                        )}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${diff.color}`}>
                          {DiffIcon && <DiffIcon className="h-3 w-3" />}
                          <span className="text-sm font-semibold">{diff.label}</span>
                        </div>
                        {(round.front_9 != null || round.back_9 != null) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {round.front_9 ?? '—'} / {round.back_9 ?? '—'}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <StatBox label="Putts" value={round.total_putts?.toString() ?? '—'} />
                      <StatBox label="Fairways" value={pct(round.fairways_hit, round.total_fairways)} />
                      <StatBox label="GIR" value={pct(round.gir_hit, round.total_gir)} />
                      <StatBox label="Scrambling" value={pct(round.successful_scrambles, round.scrambling_opportunities)} />
                    </div>

                    {(round.birdies != null || round.pars != null || round.bogeys != null) && (
                      <div className="flex gap-3 mb-4 flex-wrap">
                        {round.birdies != null && round.birdies > 0 && (
                          <ScorePill label="Birdies" value={round.birdies} color="text-[#52B788]" bg="bg-[#52B788]/10 border-[#52B788]/20" />
                        )}
                        {round.pars != null && round.pars > 0 && (
                          <ScorePill label="Pars" value={round.pars} color="text-[#D4AF37]" bg="bg-[#D4AF37]/10 border-[#D4AF37]/20" />
                        )}
                        {round.bogeys != null && round.bogeys > 0 && (
                          <ScorePill label="Bogeys" value={round.bogeys} color="text-muted-foreground" bg="bg-muted/30 border-border" />
                        )}
                        {round.double_bogeys != null && round.double_bogeys > 0 && (
                          <ScorePill label="Doubles+" value={round.double_bogeys} color="text-red-400" bg="bg-red-950/20 border-red-900/30" />
                        )}
                      </div>
                    )}

                    {round.ai_summary && (
                      <div className="p-3 rounded-lg bg-[#1B5E35]/10 border border-[#1B5E35]/20">
                        <p className="text-xs font-semibold text-[#52B788] mb-1">AI Coaching Summary</p>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{round.ai_summary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
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

function ScorePill({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${bg}`}>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
