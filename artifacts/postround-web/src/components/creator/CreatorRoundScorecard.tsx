import { Calendar, MapPin, User } from 'lucide-react'
import type { CreatorContentIdea, RoundHighlights, RoundScorecardEntry, RoundSummary } from '@/lib/creator-stories/contracts'
import { relativeToPar, scoringCategoryLabels, selectRoundMoments } from './roundHighlights'

type Round = NonNullable<CreatorContentIdea['round']>
type RoundContext = { round: RoundSummary; roundHighlights: RoundHighlights; scorecard: RoundScorecardEntry[] }

function ScoreRelative({ score, par }: { score: number | null; par: number | null }) {
  if (score === null || par === null) return <span>{score ?? '—'}</span>
  const diff = score - par
  if (diff <= -2) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary font-bold text-primary">{score}</span>
  if (diff === -1) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary font-bold text-primary">{score}</span>
  if (diff === 0) return <span className="font-medium text-foreground">{score}</span>
  if (diff === 1) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-muted-foreground text-foreground">{score}</span>
  return <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border-2 border-muted-foreground text-foreground">{score}</span>
}

function MomentList({ moments }: { moments: ReturnType<typeof selectRoundMoments>['standout'] }) {
  return (
    <ul className="mt-2 space-y-1.5 text-sm">
      {moments.map((moment) => (
        <li key={moment.hole}>
          <strong>#{moment.hole}{moment.label ? ` · ${moment.label}` : ''}</strong>
          {moment.description ? ` — ${moment.description}` : ''}
        </li>
      ))}
    </ul>
  )
}

export function CreatorRoundScorecard(props: { round: Round } | RoundContext) {
  const isContract = 'roundHighlights' in props
  const summary = props.round
  const holes = isContract ? props.scorecard : props.round.scorecard
  const highlights = isContract ? props.roundHighlights : props.round
  const categories = scoringCategoryLabels(highlights)
  const moments = selectRoundMoments(holes)

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm" data-testid="round-highlights">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Round highlights</p>
      <div className="mt-3 flex items-baseline gap-2">
        <strong className="font-serif text-4xl" data-testid="scorecard-total-score">{highlights.total_score ?? '—'}</strong>
        <span className="text-2xl font-semibold text-muted-foreground">·</span>
        <strong className="text-2xl" data-testid="scorecard-score-to-par">{relativeToPar(highlights.score_to_par)}</strong>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {summary.course_name || 'Unknown course'} · {holes.length} {holes.length === 1 ? 'hole' : 'holes'}
      </p>
      {categories.length > 0 && <p className="mt-4 font-semibold" data-testid="scorecard-scoring-categories">{categories.join(' · ')}</p>}
      <p className="mt-2 text-sm font-medium" data-testid="scorecard-performance-summary">
        {highlights.fairways_hit ?? '—'}/{highlights.total_fairways ?? '—'} Fairways ·{' '}
        {highlights.gir_hit ?? '—'}/{highlights.total_gir ?? '—'} GIR · {highlights.total_putts ?? '—'} Putts
      </p>

      {moments.standout.length > 0 && (
        <div className="mt-5" data-testid="scorecard-standout-holes">
          <h4 className="font-serif text-lg font-bold">Standout holes</h4>
          <MomentList moments={moments.standout} />
        </div>
      )}
      {moments.other.length > 0 && (
        <div className="mt-5" data-testid="scorecard-other-moments">
          <h4 className="font-serif text-lg font-bold">Other notable moments</h4>
          <MomentList moments={moments.other} />
        </div>
      )}

      <details className="group mt-5 border-t border-border pt-4" data-testid="scorecard-full-details">
        <summary className="cursor-pointer list-none font-semibold text-primary">
          View full round details <span aria-hidden="true">→</span>
        </summary>
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground" data-testid="scorecard-metadata">
            {summary.player_display_name && <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{summary.player_display_name}</span>}
            {summary.played_at && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{summary.played_at}</span>}
            {summary.tees && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{summary.tees} Tees</span>}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {highlights.front_9 !== null && <div>Front 9: <strong>{highlights.front_9}</strong></div>}
            {highlights.back_9 !== null && <div>Back 9: <strong>{highlights.back_9}</strong></div>}
            {highlights.total_penalties !== null && <div>Penalties: <strong>{highlights.total_penalties}</strong></div>}
            {highlights.three_putts !== null && <div>Three-putts: <strong>{highlights.three_putts}</strong></div>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Scorecard Details">
            {holes.map((hole) => (
              <div key={hole.hole} role="listitem" className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid={`scorecard-hole-${hole.hole}`}>
                <div className="mb-3 flex items-start justify-between border-b border-border/50 pb-3">
                  <div><strong>Hole {hole.hole}</strong><div className="text-xs text-muted-foreground">Par {hole.par ?? '—'}</div></div>
                  <ScoreRelative score={hole.score} par={hole.par} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {hole.fairway && hole.par !== 3 && <div>Fairway <strong className="uppercase">{hole.fairway}</strong></div>}
                  {hole.gir && <div>GIR <strong className="uppercase">{hole.gir}</strong></div>}
                  {hole.putts !== null && <div>Putts <strong>{hole.putts}</strong></div>}
                  {hole.chips !== null && <div>Chips <strong>{hole.chips}</strong></div>}
                  {hole.bunker !== null && <div>Bunker <strong>{hole.bunker ? 'Yes' : 'No'}</strong></div>}
                  {hole.sand_save !== null && <div>Sand save <strong>{hole.sand_save ? 'Yes' : 'No'}</strong></div>}
                  {hole.penalties !== null && hole.penalties > 0 && <div className="text-destructive">Penalty <strong>+{hole.penalties}</strong></div>}
                </div>
                {hole.player_note && <div className="mt-4 border-t border-dashed border-border/70 pt-3 text-sm italic" data-testid={`scorecard-hole-note-${hole.hole}`}>&quot;{hole.player_note}&quot;</div>}
              </div>
            ))}
          </div>
        </div>
      </details>
    </section>
  )
}