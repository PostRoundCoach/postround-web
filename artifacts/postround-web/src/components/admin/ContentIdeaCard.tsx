'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Copy,
  CheckCheck,
  Globe,
  Archive,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Hash,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ContentIdea } from '@/components/admin/ContentStudio'

interface ContentIdeaCardProps {
  idea: ContentIdea
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseStatsUsed(raw: Record<string, unknown> | null): { label: string; value: string }[] {
  if (!raw) return []
  try {
    return Object.entries(raw)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => ({ label: humanizeKey(k), value: String(v) }))
  } catch {
    return []
  }
}

const statusColors: Record<string, string> = {
  draft:     'bg-muted/50 text-muted-foreground border-border',
  published: 'bg-[#1B5E35]/20 text-[#52B788] border-[#1B5E35]/40',
  archived:  'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
}

export function ContentIdeaCard({ idea }: ContentIdeaCardProps) {
  const router = useRouter()
  const [scriptExpanded, setScriptExpanded] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [copiedHook, setCopiedHook] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const stats = parseStatsUsed(idea.stats_used)
  const statusStyle = statusColors[idea.status ?? 'draft'] ?? statusColors.draft

  // ── Clipboard helpers ────────────────────────────────────────────
  const copyText = async (text: string, type: 'script' | 'hook') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'script') {
        setCopiedScript(true)
        setTimeout(() => setCopiedScript(false), 2000)
        toast.success('Script copied to clipboard')
      } else {
        setCopiedHook(true)
        setTimeout(() => setCopiedHook(false), 2000)
        toast.success('Hook copied to clipboard')
      }
    } catch {
      toast.error('Failed to copy — clipboard access denied')
    }
  }

  // ── Status update ────────────────────────────────────────────────
  const updateStatus = async (status: 'published' | 'archived') => {
    const setLoading = status === 'published' ? setIsPublishing : setIsArchiving
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/content/${idea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Update failed')
      }
      toast.success(`Marked as ${status}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/content/${idea.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Delete failed')
      }
      toast.success('Content idea deleted')
      setDeleteOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Regenerate ───────────────────────────────────────────────────
  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const res = await fetch(`/api/admin/content/${idea.id}/regenerate`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Regeneration failed')
      }
      toast.success('Content idea regenerated')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Regeneration failed — original content unchanged')
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          {/* Top meta row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {idea.category && (
                <Badge className="bg-[#1B5E35]/20 text-[#52B788] border-[#1B5E35]/40 border">
                  {idea.category}
                </Badge>
              )}
              <Badge className={`border ${statusStyle}`}>
                {idea.status ?? 'draft'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {idea.round_id && (
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {idea.round_id.slice(0, 8)}…
                </span>
              )}
              <span>
                {new Date(idea.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Title */}
          {idea.title && (
            <h2 className="font-serif text-xl font-bold text-foreground mt-3 leading-snug">
              {idea.title}
            </h2>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Hook */}
          {idea.hook && (
            <div className="p-3 rounded-lg bg-[#1B5E35]/10 border border-[#1B5E35]/20">
              <p className="text-xs font-semibold text-[#52B788] mb-1 uppercase tracking-wide">Hook</p>
              <p className="text-sm text-foreground leading-relaxed">{idea.hook}</p>
            </div>
          )}

          {/* Script */}
          {idea.script && (
            <div className="rounded-lg bg-muted/20 border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Script</p>
                <button
                  type="button"
                  onClick={() => setScriptExpanded(!scriptExpanded)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {scriptExpanded ? (
                    <><ChevronUp className="h-3 w-3" /> Collapse</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" /> Expand</>
                  )}
                </button>
              </div>
              <div className={`px-4 py-3 ${scriptExpanded ? '' : 'max-h-24 overflow-hidden'}`}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {idea.script}
                </p>
              </div>
              {!scriptExpanded && idea.script.length > 200 && (
                <div className="h-6 bg-gradient-to-t from-muted/20 to-transparent" />
              )}
            </div>
          )}

          {/* Stats used */}
          {stats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stats Used</p>
              <div className="flex flex-wrap gap-2">
                {stats.map(({ label, value }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border text-xs"
                  >
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => idea.hook && copyText(idea.hook, 'hook')}
              disabled={!idea.hook}
            >
              {copiedHook ? <CheckCheck className="h-3.5 w-3.5 text-[#52B788]" /> : <Copy className="h-3.5 w-3.5" />}
              Copy Hook
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => idea.script && copyText(idea.script, 'script')}
              disabled={!idea.script}
            >
              {copiedScript ? <CheckCheck className="h-3.5 w-3.5 text-[#52B788]" /> : <Copy className="h-3.5 w-3.5" />}
              Copy Script
            </Button>

            {idea.status !== 'published' && (
              <Button
                variant="outline"
                size="sm"
                disabled={isPublishing}
                onClick={() => updateStatus('published')}
                className="text-[#52B788] border-[#1B5E35]/40 hover:bg-[#1B5E35]/10"
              >
                {isPublishing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                Mark Published
              </Button>
            )}

            {idea.status !== 'archived' && (
              <Button
                variant="outline"
                size="sm"
                disabled={isArchiving}
                onClick={() => updateStatus('archived')}
                className="text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37]/10"
              >
                {isArchiving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                Archive
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={isRegenerating}
              onClick={handleRegenerate}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating…' : 'Regenerate'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(true)}
              className="text-red-400 border-red-900/40 hover:bg-red-950/20 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete content idea?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{idea.title ?? 'this content idea'}&rdquo;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
