'use client'

import { Badge } from '@/components/ui/badge'
import type { ScorecardHole, StoryCandidate } from '@/lib/creator-stories/contracts'
import { archetypeLabel, SCORECARD_COLUMNS, scorecardValue } from './storyCandidateRendering'

function Scorecard({ rows, candidateId }: { rows: ScorecardHole[]; candidateId: string }) {
  if (rows.length === 0) return null
  const keys: Array<Exclude<keyof ScorecardHole, 'hole'>> = [
    'yards', 'par', 'score', 'fairway', 'green', 'playable', 'chips', 'putts', 'sand', 'penalties',
  ]
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70" data-testid={`scorecard-candidate-${candidateId}`}>
      <table className="w-full min-w-[44rem] text-left text-xs">
        <caption className="sr-only">Stored scorecard evidence</caption>
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>{SCORECARD_COLUMNS.map((column) => <th key={column} scope="col" className="whitespace-nowrap px-2 py-2 font-semibold">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hole} className="border-t border-border/60">
              <th scope="row" className="px-2 py-2 font-semibold">{row.hole}</th>
              {keys.map((key) => <td key={key} className="px-2 py-2 text-muted-foreground">{scorecardValue(row, key)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StoryCandidateCard({ candidate }: { candidate: StoryCandidate }) {
  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm" data-testid={`card-story-candidate-${candidate.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="secondary" data-testid={`badge-story-candidate-archetype-${candidate.id}`}>{archetypeLabel(candidate.archetype)}</Badge>
          <h4 className="mt-3 font-serif text-xl font-bold" data-testid={`text-story-candidate-title-${candidate.id}`}>{candidate.title}</h4>
        </div>
        <span className="text-xs font-semibold text-muted-foreground" data-testid={`text-story-candidate-confidence-${candidate.id}`}>Confidence: {candidate.confidence}</span>
      </div>
      <div className="mt-5 space-y-4 text-sm leading-relaxed">
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Hook</p><p className="mt-1">{candidate.hook}</p></div>
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Story</p><p className="mt-1 text-muted-foreground">{candidate.summary}</p></div>
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Why it matters</p><p className="mt-1 text-muted-foreground">{candidate.why_interesting}</p></div>
        {candidate.suggested_format && <p className="text-muted-foreground"><span className="font-semibold text-foreground">Suggested format: </span>{candidate.suggested_format}</p>}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Supporting evidence</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            {candidate.evidence.map((item, index) => <li key={`${item.label}-${index}`}><span className="font-medium text-foreground">{item.label}: </span>{item.detail}</li>)}
          </ul>
        </div>
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Relevant holes</p><p className="mt-1 text-muted-foreground">{candidate.relevant_holes.length ? candidate.relevant_holes.join(', ') : '—'}</p></div>
        {candidate.transcript_highlights.length > 0 && <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Round Buddy highlights</p><ul className="mt-2 space-y-2 text-muted-foreground">{candidate.transcript_highlights.map((highlight, index) => <li key={index} className="border-l-2 border-primary/40 pl-3">“{highlight.excerpt}”</li>)}</ul></div>}
        <Scorecard rows={candidate.scorecard} candidateId={candidate.id} />
      </div>
    </section>
  )
}