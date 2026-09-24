'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function creatorCopyText(...parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join('\n\n')
}

export function CreatorCopyButton({
  text,
  name,
  testId,
}: {
  text: string
  name: string
  testId: string
}) {
  if (!text) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${name} copied to clipboard`)
    } catch {
      toast.error('Failed to copy — clipboard access denied')
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      aria-label={`Copy ${name}`}
      data-testid={testId}
      onClick={() => void handleCopy()}
    >
      <Copy className="h-4 w-4" aria-hidden="true" />
      Copy
    </Button>
  )
}