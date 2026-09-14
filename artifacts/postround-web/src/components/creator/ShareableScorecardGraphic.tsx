'use client'

import { useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { CreatorContentIdea, StoryPermissionStatus } from '@/lib/creator-stories/contracts'

type Round = NonNullable<CreatorContentIdea['round']>

const WIDTH = 1080
const HEIGHT = 1350

function display(value: string | number | null) {
  return value === null || value === '' ? '—' : String(value)
}

function scoreToPar(round: Round) {
  if (round.total_score === null || round.course_par === null) return null
  const difference = round.total_score - round.course_par
  if (difference === 0) return 'E'
  return difference > 0 ? `+${difference}` : String(difference)
}

function safeFilePart(value: string | null) {
  return (value || 'round-scorecard')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'round-scorecard'
}

export function ShareableScorecardGraphic({
  idea,
  permissionStatus,
}: {
  idea: CreatorContentIdea
  permissionStatus: StoryPermissionStatus
}) {
  const [includeNotes, setIncludeNotes] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadFailed, setDownloadFailed] = useState(false)
  const round = idea.round
  const canExport = permissionStatus === 'approved'
  const sortedHoles = useMemo(
    () => [...(round?.scorecard ?? [])].sort((a, b) => a.hole - b.hole),
    [round],
  )

  if (!round) return null

  const handleDownload = async () => {
    if (!canExport || isDownloading) return
    setIsDownloading(true)
    setDownloadFailed(false)

    try {
      const svg = document.querySelector<SVGSVGElement>(`#share-scorecard-${idea.id}`)
      if (!svg) throw new Error('Scorecard preview is unavailable')

      const serialized = new XMLSerializer().serializeToString(svg)
      const source = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
      const sourceUrl = URL.createObjectURL(source)

      try {
        const image = new Image()
        image.decoding = 'async'
        image.src = sourceUrl
        await image.decode()

        const canvas = document.createElement('canvas')
        canvas.width = WIDTH
        canvas.height = HEIGHT
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Image rendering is unavailable')
        context.drawImage(image, 0, 0, WIDTH, HEIGHT)

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('Image generation failed')

        const downloadUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `${safeFilePart(round.course_name)}-scorecard.png`
        link.click()
        URL.revokeObjectURL(downloadUrl)
      } finally {
        URL.revokeObjectURL(sourceUrl)
      }
    } catch {
      setDownloadFailed(true)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4 sm:p-5" data-testid={`section-share-scorecard-${idea.id}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Share-ready scorecard</p>
          <p className="text-sm text-muted-foreground">
            Preview and download a 4:5 social image.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor={`notes-${idea.id}`} className="text-sm font-medium">Round Buddy notes</label>
          <Switch
            id={`notes-${idea.id}`}
            checked={includeNotes}
            onCheckedChange={setIncludeNotes}
            data-testid={`switch-scorecard-notes-${idea.id}`}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <svg
          id={`share-scorecard-${idea.id}`}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`Shareable scorecard for ${round.course_name || 'this round'}`}
          className="block h-auto w-full"
          data-testid={`preview-share-scorecard-${idea.id}`}
        >
          <rect width={WIDTH} height={HEIGHT} fill="#f7f6f1" />
          <rect x="48" y="48" width="984" height="1254" rx="32" fill="#ffffff" stroke="#deddd6" strokeWidth="2" />
          <text x="88" y="112" fill="#245c43" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" letterSpacing="4">POST ROUND</text>
          <text x="88" y="176" fill="#17251f" fontFamily="Georgia, serif" fontSize="48" fontWeight="700">
            {round.course_name || 'Round scorecard'}
          </text>
          <text x="88" y="218" fill="#68736d" fontFamily="Arial, sans-serif" fontSize="22">
            {[round.player_display_name, round.played_at, round.tees ? `${round.tees} tees` : null].filter(Boolean).join('  •  ')}
          </text>

          <rect x="88" y="250" width="280" height="126" rx="20" fill="#eaf3ed" />
          <text x="116" y="290" fill="#245c43" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="2">TOTAL SCORE</text>
          <text x="116" y="348" fill="#17251f" fontFamily="Arial, sans-serif" fontSize="54" fontWeight="700">{display(round.total_score)}</text>
          {scoreToPar(round) && <text x="235" y="346" fill="#68736d" fontFamily="Arial, sans-serif" fontSize="28">{scoreToPar(round)}</text>}

          <rect x="388" y="250" width="280" height="126" rx="20" fill="#f3f2ed" />
          <text x="416" y="290" fill="#68736d" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="2">PUTTS</text>
          <text x="416" y="348" fill="#17251f" fontFamily="Arial, sans-serif" fontSize="54" fontWeight="700">{display(round.total_putts)}</text>

          <rect x="688" y="250" width="256" height="126" rx="20" fill="#f3f2ed" />
          <text x="716" y="290" fill="#68736d" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="2">FAIRWAYS / GIR</text>
          <text x="716" y="340" fill="#17251f" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="700">
            {round.fairways_hit ?? '—'}/{round.total_fairways ?? '—'}  •  {round.gir_hit ?? '—'}/{round.total_gir ?? '—'}
          </text>

          {[0, 1].map((column) => (
            <g key={column} transform={`translate(${88 + column * 492}, 420)`}>
              <rect width="464" height="54" rx="12" fill="#245c43" />
              <text x="20" y="35" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700">HOLE</text>
              <text x="120" y="35" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700">PAR</text>
              <text x="202" y="35" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700">SCORE</text>
              <text x="310" y="35" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700">PUTTS</text>
              {sortedHoles.slice(column * 9, column * 9 + 9).map((hole, index) => {
                const y = 92 + index * 82
                return (
                  <g key={hole.hole}>
                    <line x1="0" x2="464" y1={y + 20} y2={y + 20} stroke="#deddd6" />
                    <text x="20" y={y} fill="#17251f" fontFamily="Arial, sans-serif" fontSize="25" fontWeight="700">{hole.hole}</text>
                    <text x="120" y={y} fill="#4d5a54" fontFamily="Arial, sans-serif" fontSize="25">{display(hole.par)}</text>
                    <text x="214" y={y} fill="#17251f" fontFamily="Arial, sans-serif" fontSize="27" fontWeight="700">{display(hole.score)}</text>
                    <text x="326" y={y} fill="#4d5a54" fontFamily="Arial, sans-serif" fontSize="25">{display(hole.putts)}</text>
                    {includeNotes && hole.player_note && (
                      <text x="20" y={y + 30} fill="#68736d" fontFamily="Arial, sans-serif" fontSize="15" fontStyle="italic">
                        {hole.player_note.length > 48 ? `${hole.player_note.slice(0, 47)}…` : hole.player_note}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          ))}

          <text x="540" y="1260" textAnchor="middle" fill="#68736d" fontFamily="Arial, sans-serif" fontSize="18">
            {includeNotes ? 'Includes Round Buddy notes' : 'Scorecard only'}  •  postround.co
          </text>
        </svg>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {canExport
            ? 'Player approval confirmed. This graphic is ready to publish.'
            : 'Player approval is required before this graphic can be downloaded.'}
        </p>
        <Button
          type="button"
          onClick={() => void handleDownload()}
          disabled={!canExport || isDownloading}
          data-testid={`button-download-scorecard-${idea.id}`}
        >
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isDownloading ? 'Generating…' : 'Download PNG'}
        </Button>
      </div>
      {downloadFailed && (
        <p className="text-sm text-destructive" role="alert" data-testid={`status-scorecard-download-error-${idea.id}`}>
          The image could not be generated. Please try again.
        </p>
      )}
    </section>
  )
}