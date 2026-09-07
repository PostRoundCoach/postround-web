'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { generateStoryDraft } from '@/lib/creator-stories/client'
import type { ScorecardHole, StoryCandidate, StoryDraftFormat } from '@/lib/creator-stories/contracts'
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
  const [format, setFormat] = useState<StoryDraftFormat>('caption')
  const [draft, setDraft] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerateDraft() {
    setIsGenerating(true)
    setError(null)
    try {
      const supabase = createClient()
      if (!supabase) throw new Error('Creator workspace is not configured.')
      const result = await generateStoryDraft(supabase, {
        story_id: candidate.story_id,
        candidate_id: candidate.id,
        format,
      })
      setDraft(result.draft.content)
    } catch {
      setError('The draft could not be generated. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

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
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Create an editable draft</p>
          <p className="mt-1 text-xs text-muted-foreground">Generated copy is separate from the stored evidence above. Review and edit it before publishing.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Select value={format} onValueChange={(value) => setFormat(value as StoryDraftFormat)}>
              <SelectTrigger className="bg-background sm:w-52" aria-label="Draft format" data-testid={`select-draft-format-${candidate.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="caption">Social caption</SelectItem>
                <SelectItem value="short_video_script">Short video script</SelectItem>
                <SelectItem value="carousel_outline">Carousel outline</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={() => void handleGenerateDraft()} disabled={isGenerating} data-testid={`button-generate-draft-${candidate.id}`}>
              {isGenerating ? 'Creating draft…' : draft === null ? 'Create draft' : 'Regenerate draft'}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
          {draft !== null && (
            <div className="mt-4">
              <label htmlFor={`draft-${candidate.id}`} className="text-xs font-semibold text-foreground">Editable draft</label>
              <Textarea
                id={`draft-${candidate.id}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="mt-2 min-h-56 bg-background leading-relaxed"
                data-testid={`textarea-draft-${candidate.id}`}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}