'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { GeneratedIdea } from '@/lib/creator-stories/contracts'

export function GeneratedIdeaCard({ idea }: { idea: GeneratedIdea }) {
  const copyText = async (label: 'Hook' | 'Script', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard`)
    } catch {
      toast.error('Failed to copy — clipboard access denied')
    }
  }

  return (
    <section
      className="rounded-xl border border-border/70 bg-background p-5 shadow-sm"
      data-testid={`card-generated-idea-${idea.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4
          className="font-serif text-xl font-bold"
          data-testid={`text-generated-idea-title-${idea.id}`}
        >
          {idea.title}
        </h4>
        {idea.category && (
          <Badge variant="secondary" data-testid={`badge-generated-idea-category-${idea.id}`}>
            {idea.category}
          </Badge>
        )}
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Hook
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyText('Hook', idea.hook)}
              data-testid={`button-copy-hook-${idea.id}`}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Hook
            </Button>
          </div>
          <p
            className="text-sm leading-relaxed text-foreground"
            data-testid={`text-generated-idea-hook-${idea.id}`}
          >
            {idea.hook}
          </p>
        </div>

        <div className="border-t border-border/70 pt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Script
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyText('Script', idea.script)}
              data-testid={`button-copy-script-${idea.id}`}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Script
            </Button>
          </div>
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground"
            data-testid={`text-generated-idea-script-${idea.id}`}
          >
            {idea.script}
          </p>
        </div>
      </div>
    </section>
  )
}