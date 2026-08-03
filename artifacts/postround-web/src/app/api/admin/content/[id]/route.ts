import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/admin/content/[id] — update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { status: string }
  const { status } = body

  const allowed = ['draft', 'published', 'archived']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('content_ideas')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/content/[id] — permanently delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('content_ideas')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
