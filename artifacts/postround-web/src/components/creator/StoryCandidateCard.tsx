'use client'

import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import type { CreatorContentIdea } from '@/lib/creator-stories/contracts'
import { CreatorRoundScorecard } from './CreatorRoundScorecard'
import { ShareableScorecardGraphic } from './ShareableScorecardGraphic'
import type { StoryPermissionStatus } from '@/lib/creator-stories/contracts'

export function StoryCandidateCard({
  candidate: idea,
  permissionStatus,
}: {
  candidate: CreatorContentIdea
  permissionStatus: StoryPermissionStatus
}) {
  return (
    <details className="group min-w-0 rounded-xl border border-border/70 bg-background p-6 shadow-sm" data-testid={`card-story-candidate-${idea.id}`}>
      <summary className="cursor-pointer list-none">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge className="max-w-full whitespace-normal break-words text-left" variant="secondary" data-testid={`badge-story-candidate-archetype-${idea.id}`}>{idea.category}</Badge>
            <h4 className="mt-4 break-words font-serif text-2xl font-bold" data-testid={`text-story-candidate-title-${idea.id}`}>{idea.title}</h4>
          </div>
        </div>
        <p className="mt-4 break-words font-medium">{idea.hook}</p>
        <p className="mt-4 text-xs font-semibold text-primary group-open:hidden">View full details and context</p>
      </summary>

      <div className="mt-8 space-y-8 text-sm leading-relaxed border-t border-border pt-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Ready-to-use script</p>
          <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
            <p className="whitespace-pre-wrap break-words text-foreground">{idea.script}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Round Context</p>
          {idea.round ? (
            <>
              <CreatorRoundScorecard round={idea.round} />
              <div className="mt-6">
                <ShareableScorecardGraphic idea={idea} permissionStatus={permissionStatus} />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-6 flex gap-3 text-muted-foreground" data-testid={`status-round-unavailable-${idea.id}`}>
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Source round context is unavailable.</p>
                <p className="mt-1 text-sm">This is an older content idea that was generated before full round details were attached.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </details>
  )
}