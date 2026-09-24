'use client'

import { useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RoundWebContract } from '@/lib/creator-stories/contracts'
import { downloadSvgPng, safeFilePart } from './asset-export'
import { highlightsSvg, OVERLAY_SIZE, roundBuddySvg } from './overlay-assets'

export function ShareableAssets({ contract, storyId, approved }: {
  contract: RoundWebContract
  storyId: string
  approved: boolean
}) {
  const [busy, setBusy] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inFlight = useRef(new Set<string>())

  async function download(key: string, render: () => string, filename: string) {
    if (!approved || inFlight.current.has(key)) return
    inFlight.current.add(key)
    setBusy((current) => [...current, key])
    setErrors((current) => { const next = { ...current }; delete next[key]; return next })
    try {
      await downloadSvgPng(render(), OVERLAY_SIZE.width, OVERLAY_SIZE.height, filename)
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : 'The image could not be generated. Please try again.',
      }))
    } finally {
      inFlight.current.delete(key)
      setBusy((current) => current.filter((item) => item !== key))
    }
  }

  const prefix = safeFilePart(contract.round.course_name)
  const options = [
    {
      key: 'highlights', label: 'Round Highlights',
      render: () => highlightsSvg(
        contract.creatorContentStory.available ? contract.creatorContentStory.candidate.headline : '',
        contract.round, contract.roundHighlights,
      ),
      filename: `${prefix}-round-highlights.png`,
    },
    ...contract.roundBuddyMessages.map((message, index) => ({
      key: `buddy-${index}`, label: `Round Buddy${message.hole_number === null ? '' : ` · Hole ${message.hole_number}`}`,
      render: () => roundBuddySvg(message),
      filename: `${prefix}-round-buddy-${index + 1}.png`,
    })),
  ]

  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5" data-testid={`section-shareable-assets-${storyId}`}>
      <h3 className="font-semibold">Shareable Assets</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Transparent 1080 × 480 video overlays. {approved ? 'Ready to download.' : 'Player approval is required to download.'}
      </p>
      <div className="mt-4 grid gap-2">
        {options.map((option) => (
          <div key={option.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3">
            <span className="text-sm font-medium">{option.label}</span>
            <Button type="button" size="sm" variant="outline"
              disabled={!approved || busy.includes(option.key)}
              aria-busy={busy.includes(option.key)}
              data-testid={`button-download-${option.key}-${storyId}`}
              onClick={() => void download(option.key, option.render, option.filename)}>
              {busy.includes(option.key) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy.includes(option.key) ? 'Generating…' : `Download ${option.label}`}
            </Button>
            {errors[option.key] && <p className="w-full text-sm text-destructive" role="alert" data-testid={`status-${option.key}-download-error-${storyId}`}>{errors[option.key]}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}