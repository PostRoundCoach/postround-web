import { createClient } from '@/lib/supabase/server'
import { ContentStudio } from '@/components/admin/ContentStudio'

const PAGE_SIZE = 25

interface ContentPageProps {
  searchParams: Promise<{
    status?: string
    category?: string
    order?: string
    search?: string
    page?: string
  }>
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const params = await searchParams
  const status   = params.status   ?? 'all'
  const category = params.category ?? 'all'
  const order    = params.order    ?? 'newest'
  const search   = params.search   ?? ''
  const page     = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset   = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  // Build the query
  let query = supabase
    .from('content_ideas')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: order === 'oldest' })
    .range(offset, offset + PAGE_SIZE - 1)

  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (category !== 'all') {
    query = query.eq('category', category)
  }
  if (search.trim()) {
    // Search across title, hook, script, category, round_id
    query = query.or(
      `title.ilike.%${search}%,hook.ilike.%${search}%,script.ilike.%${search}%,category.ilike.%${search}%,round_id.eq.${search.trim()}`
    )
  }

  const [{ data: ideas, count, error }, { data: catRows }] = await Promise.all([
    query,
    supabase
      .from('content_ideas')
      .select('category')
      .not('category', 'is', null)
      .order('category'),
  ])

  // Deduplicate categories
  const categories = Array.from(
    new Set((catRows ?? []).map((r: { category: string }) => r.category).filter(Boolean))
  ) as string[]

  return (
    <ContentStudio
      initialIdeas={ideas ?? []}
      totalCount={count ?? 0}
      categories={categories}
      currentFilters={{ status, category, order, search, page }}
      error={error?.message ?? null}
    />
  )
}
