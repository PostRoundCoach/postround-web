'use client'

import { Badge } from '@/components/ui/badge'
import type { CreatorContentIdea, StoryPermissionStatus } from '@/lib/creator-stories/contracts'

export function StoryCandidateCard({
  candidate: idea,
  permissionStatus,
}: {
  candidate: CreatorContentIdea
  permissionStatus: StoryPermissionStatus
}) {
  const stats = Object.entries(idea.stats_used)

  return (
    <details className="group rounded-xl border border-border/70 bg-background p-5 shadow-sm" data-testid={`card-story-candidate-${idea.id}`}>
      <summary className="cursor-pointer list-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="secondary" data-testid={`badge-story-candidate-archetype-${idea.id}`}>{idea.category}</Badge>
          <h4 className="mt-3 font-serif text-xl font-bold" data-testid={`text-story-candidate-title-${idea.id}`}>{idea.title}</h4>
        </div>
        <Badge variant={permissionStatus === 'approved' ? 'default' : 'outline'}>
          {permissionStatus === 'approved' ? 'Publishable' : idea.status}
        </Badge>
      </div>
      <p className="mt-4 text-sm font-medium">{idea.hook}</p>
      <p className="mt-3 text-xs font-semibold text-primary group-open:hidden">Open idea</p>
      </summary>
      <div className="mt-5 space-y-4 text-sm leading-relaxed">
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Script</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{idea.script}</p></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Stats used</p>
          {stats.length === 0 ? <p className="mt-1 text-muted-foreground">No stats were stored.</p> : (
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {stats.map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/40 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : JSON.stringify(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </details>
  )
}