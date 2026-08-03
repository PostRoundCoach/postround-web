import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/content/[id]/regenerate
 * Calls the existing Supabase Edge Function to regenerate a content idea,
 * then updates the record in place with the new content.
 *
 * Requires:
 *   SUPABASE_SERVICE_ROLE_KEY — set in Vercel env vars (server-side only)
 *   SUPABASE_CONTENT_FUNCTION_NAME — Edge Function name (default: generate-content-idea)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the current record to get round_id and category
  const { data: idea, error: fetchError } = await supabase
    .from('content_ideas')
    .select('id, round_id, category')
    .eq('id', id)
    .single()

  if (fetchError || !idea) {
    return NextResponse.json({ error: 'Content idea not found' }, { status: 404 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const functionName = process.env.SUPABASE_CONTENT_FUNCTION_NAME ?? 'generate-content-idea'

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' },
      { status: 503 }
    )
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`

  let edgeResponse: Response
  try {
    edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        round_id: idea.round_id,
        category: idea.category,
        content_idea_id: id, // pass the existing ID so the function can update in place if it handles it
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to reach Edge Function' }, { status: 502 })
  }

  if (!edgeResponse.ok) {
    const text = await edgeResponse.text().catch(() => 'Unknown error')
    return NextResponse.json(
      { error: `Edge Function returned ${edgeResponse.status}: ${text}` },
      { status: 502 }
    )
  }

  // If the Edge Function returns new content, update the record here.
  // If the function updates the DB directly, this is a no-op and we just return ok.
  let newContent: Record<string, unknown> | null = null
  try {
    const json = await edgeResponse.json() as Record<string, unknown>
    // Accept content at the top level or nested under a "data" key
    const payload = (json.data as Record<string, unknown>) ?? json
    if (payload.title || payload.hook || payload.script) {
      newContent = payload
    }
  } catch {
    // Edge Function may not return JSON content — that's fine if it updates the DB directly
  }

  if (newContent) {
    const update: Record<string, unknown> = {}
    if (newContent.title)      update.title      = newContent.title
    if (newContent.hook)       update.hook       = newContent.hook
    if (newContent.script)     update.script     = newContent.script
    if (newContent.stats_used) update.stats_used = newContent.stats_used

    const { error: updateError } = await supabase
      .from('content_ideas')
      .update(update)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
