'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { FileText, Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ContentIdeaCard } from '@/components/admin/ContentIdeaCard'

export interface ContentIdea {
  id: string
  round_id: string | null
  category: string | null
  title: string | null
  hook: string | null
  script: string | null
  stats_used: Record<string, unknown> | null
  status: string | null
  created_at: string
}

interface Filters {
  status: string
  category: string
  order: string
  search: string
  page: number
}

interface ContentStudioProps {
  initialIdeas: ContentIdea[]
  totalCount: number
  categories: string[]
  currentFilters: Filters
  error: string | null
}

const PAGE_SIZE = 25

export function ContentStudio({
  initialIdeas,
  totalCount,
  categories,
  currentFilters,
  error,
}: ContentStudioProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParams = useCallback(
    (updates: Partial<Filters & { page: number }>) => {
      const current = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          current.set(k, String(v))
        } else {
          current.delete(k)
        }
      })
      // Reset to page 1 when filters change (unless explicitly setting page)
      if (!('page' in updates)) current.set('page', '1')
      startTransition(() => {
        router.push(`${pathname}?${current.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Content Studio</h1>
          <p className="text-muted-foreground">
            {totalCount > 0
              ? `${totalCount} idea${totalCount === 1 ? '' : 's'}`
              : 'No content ideas found'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-sm">Filters</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-xl bg-muted/20 border border-border">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search title, hook, script, category, round ID…"
            defaultValue={currentFilters.search}
            onChange={(e) => {
              const val = e.target.value
              // Debounce via a simple timeout trick (controlled by React key would need state)
              clearTimeout((window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer)
              ;(window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
                () => updateParams({ search: val }),
                400
              )
            }}
            className="pl-9 h-9"
          />
        </div>

        {/* Status */}
        <Select
          value={currentFilters.status}
          onValueChange={(val) => updateParams({ status: val })}
        >
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Category */}
        <Select
          value={currentFilters.category}
          onValueChange={(val) => updateParams({ category: val })}
        >
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Order */}
        <Select
          value={currentFilters.order}
          onValueChange={(val) => updateParams({ order: val })}
        >
          <SelectTrigger className="w-full sm:w-32 h-9">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="space-y-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border p-6 space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isPending && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center mb-6">
          <p className="text-sm text-red-400">Failed to load content ideas: {error}</p>
        </div>
      )}

      {/* Empty state */}
      {!error && !isPending && initialIdeas.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/10 py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No content ideas found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {currentFilters.search || currentFilters.status !== 'all' || currentFilters.category !== 'all'
              ? 'Try adjusting your filters.'
              : 'Content ideas will appear here once the app generates them.'}
          </p>
        </div>
      )}

      {/* Cards */}
      {!isPending && initialIdeas.length > 0 && (
        <div className="space-y-4">
          {initialIdeas.map((idea) => (
            <ContentIdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isPending && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Page {currentFilters.page} of {totalPages} · {totalCount} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentFilters.page <= 1}
              onClick={() => updateParams({ page: currentFilters.page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentFilters.page >= totalPages}
              onClick={() => updateParams({ page: currentFilters.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
