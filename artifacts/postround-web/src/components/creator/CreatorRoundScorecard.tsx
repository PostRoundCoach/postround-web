import { Calendar, MapPin, User } from 'lucide-react'
import type { CreatorContentIdea, RoundHighlights, RoundScorecardEntry, RoundSummary } from '@/lib/creator-stories/contracts'

type Round = NonNullable<CreatorContentIdea['round']>
type RoundContext = { round: RoundSummary; roundHighlights: RoundHighlights; scorecard: RoundScorecardEntry[] }

function getGirColor(gir: string | null) {
  if (gir === 'hit') return 'bg-green-500/10 text-green-700'
  return 'bg-muted text-muted-foreground'
}

function getFairwayColor(fairway: string | null) {
  if (fairway === 'hit') return 'bg-green-500/10 text-green-700'
  return 'bg-muted text-muted-foreground'
}

function ScoreRelative({ score, par }: { score: number | null; par: number | null }) {
  if (score === null || par === null) return <span>{score ?? '-'}</span>
  const diff = score - par
  
  if (diff <= -2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-primary text-primary font-bold">{score}</span>
  if (diff === -1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-primary text-primary font-bold">{score}</span>
  if (diff === 0) return <span className="font-medium text-foreground">{score}</span>
  if (diff === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm border border-muted-foreground text-foreground">{score}</span>
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm border-2 border-muted-foreground text-foreground">{score}</span>
}

export function CreatorRoundScorecard(props: { round: Round } | RoundContext) {
  const isContract = 'roundHighlights' in props
  const summary = props.round
  const holes = isContract ? props.scorecard : props.round.scorecard
  const highlights = isContract ? props.roundHighlights : props.round
  const front9 = holes.filter(h => h.hole >= 1 && h.hole <= 9).sort((a, b) => a.hole - b.hole)
  const back9 = holes.filter(h => h.hole >= 10 && h.hole <= 18).sort((a, b) => a.hole - b.hole)

  return (
    <div className="space-y-6">
      {/* Metadata */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4" data-testid="scorecard-metadata">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl font-bold text-foreground" data-testid="scorecard-course-name">
              {summary.course_name || 'Unknown Course'}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {summary.player_display_name && (
                <span className="flex items-center gap-1.5" data-testid="scorecard-player-name">
                  <User className="h-4 w-4" /> {summary.player_display_name}
                </span>
              )}
              {summary.played_at && (
                <span className="flex items-center gap-1.5" data-testid="scorecard-played-at">
                  <Calendar className="h-4 w-4" /> {summary.played_at}
                </span>
              )}
              {summary.tees && (
                <span className="flex items-center gap-1.5" data-testid="scorecard-tees">
                  <MapPin className="h-4 w-4" /> {summary.tees} Tees
                </span>
              )}
            </div>
          </div>
          
          {(highlights.total_score !== null || highlights.total_putts !== null) && (
            <div className="flex gap-4 text-center">
              {highlights.total_score !== null && (
                <div className="bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Score</div>
                  <div className="text-2xl font-bold text-primary" data-testid="scorecard-total-score">{highlights.total_score}</div>
                </div>
              )}
              {highlights.total_putts !== null && (
                <div className="bg-muted px-4 py-2 rounded-lg">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Putts</div>
                  <div className="text-2xl font-bold text-foreground" data-testid="scorecard-total-putts">{highlights.total_putts}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-4 text-sm">
           {highlights.front_9 !== null && <div><span className="text-muted-foreground">Front 9:</span> <span className="font-medium" data-testid="scorecard-front-9">{highlights.front_9}</span></div>}
           {highlights.back_9 !== null && <div><span className="text-muted-foreground">Back 9:</span> <span className="font-medium" data-testid="scorecard-back-9">{highlights.back_9}</span></div>}
           {highlights.fairways_hit !== null && highlights.total_fairways !== null && (
             <div><span className="text-muted-foreground">Fairways:</span> <span className="font-medium" data-testid="scorecard-fairways-hit">{highlights.fairways_hit} / {highlights.total_fairways}</span></div>
          )}
           {highlights.gir_hit !== null && highlights.total_gir !== null && (
             <div><span className="text-muted-foreground">GIR:</span> <span className="font-medium" data-testid="scorecard-gir-hit">{highlights.gir_hit} / {highlights.total_gir}</span></div>
          )}
        </div>
      </div>

      {/* Holes Grid - Responsive */}
      <div className="space-y-4">
        <h4 className="font-serif text-lg font-bold text-foreground px-1 sr-only">Scorecard Details</h4>
        
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Scorecard Details">
           {holes.map(hole => (
            <div key={hole.hole} role="listitem" className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between group hover:border-primary/30 transition-colors" data-testid={`scorecard-hole-${hole.hole}`}>
              <div>
                <div className="flex justify-between items-start mb-3 border-b border-border/50 pb-3">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground" data-testid={`scorecard-hole-number-${hole.hole}`}>Hole {hole.hole}</div>
                    <div className="text-xs text-muted-foreground mt-0.5" data-testid={`scorecard-hole-par-${hole.hole}`}>Par {hole.par ?? '-'}</div>
                  </div>
                  <div className="text-lg" data-testid={`scorecard-hole-score-${hole.hole}`}>
                    <ScoreRelative score={hole.score} par={hole.par} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  {hole.fairway && hole.par !== 3 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fairway</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium ${getFairwayColor(hole.fairway)} uppercase text-[10px]`} data-testid={`scorecard-hole-fairway-${hole.hole}`}>
                        {hole.fairway}
                      </span>
                    </div>
                  )}
                  {hole.gir && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GIR</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium ${getGirColor(hole.gir)} uppercase text-[10px]`} data-testid={`scorecard-hole-gir-${hole.hole}`}>
                        {hole.gir}
                      </span>
                    </div>
                  )}
                  {hole.putts !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Putts</span>
                      <span className="font-medium text-foreground" data-testid={`scorecard-hole-putts-${hole.hole}`}>{hole.putts}</span>
                    </div>
                  )}
                  {hole.chips !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chips</span>
                      <span className="font-medium text-foreground" data-testid={`scorecard-hole-chips-${hole.hole}`}>{hole.chips}</span>
                    </div>
                  )}
                  {hole.bunker !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bunker</span>
                      <span className="font-medium text-foreground" data-testid={`scorecard-hole-bunker-${hole.hole}`}>{hole.bunker ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {hole.sand_save !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sand Save</span>
                      <span className="font-medium text-foreground" data-testid={`scorecard-hole-sand-save-${hole.hole}`}>{hole.sand_save ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {hole.penalties !== null && hole.penalties > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-destructive">Penalty</span>
                      <span className="font-medium text-destructive" data-testid={`scorecard-hole-penalties-${hole.hole}`}>+{hole.penalties}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {hole.player_note && (
                <div className="mt-4 pt-3 border-t border-dashed border-border/70 text-sm text-foreground italic bg-primary/5 -mx-4 -mb-4 px-4 py-3 rounded-b-xl" data-testid={`scorecard-hole-note-${hole.hole}`}>
                  "{hole.player_note}"
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}