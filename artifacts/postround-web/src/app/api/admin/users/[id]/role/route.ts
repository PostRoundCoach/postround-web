import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const ALLOWED_ROLES = ['user', 'admin', 'coach'] as const
type Role = (typeof ALLOWED_ROLES)[number]

/**
 * PATCH /api/admin/users/[id]/role
 * Body: { role: 'user' | 'admin' | 'coach' }
 *
 * Security:
 *  - Caller must be authenticated and have app_metadata.role === 'admin'
 *  - Self-demotion (caller demoting themselves from admin) is blocked
 *  - Updates both profiles.role (display) and app_metadata.role (access gate)
 *  - Writes to admin_audit_log
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in server environment variables.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params

  // ── Auth check ────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user: caller },
  } = await supabase.auth.getUser()

  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (caller.app_metadata?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: admin access required' },
      { status: 403 }
    )
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  let body: { role?: unknown }
  try {
    body = (await request.json()) as { role?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const newRole = body.role as string
  if (!ALLOWED_ROLES.includes(newRole as Role)) {
    return NextResponse.json(
      { error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  // ── Prevent self-demotion ─────────────────────────────────────────────────
  if (targetId === caller.id && newRole !== 'admin') {
    return NextResponse.json(
      { error: 'Self-demotion is not allowed' },
      { status: 400 }
    )
  }

  // ── Service-role operations ───────────────────────────────────────────────
  let serviceClient: ReturnType<typeof createServiceClient>
  try {
    serviceClient = createServiceClient()
  } catch {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' },
      { status: 503 }
    )
  }

  // Fetch current role for audit log
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', targetId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const oldRole = profile.role as string

  // No-op if role is already correct
  if (oldRole === newRole) {
    return NextResponse.json({ ok: true, role: newRole })
  }

  // Update profiles.role
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetId)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Update app_metadata.role (controls admin layout access gate)
  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    targetId,
    { app_metadata: { role: newRole } }
  )

  if (authError) {
    // Roll back profiles.role to keep them in sync
    await serviceClient
      .from('profiles')
      .update({ role: oldRole })
      .eq('id', targetId)
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Write audit log (best-effort — don't fail the request if this errors)
  await serviceClient.from('admin_audit_log').insert({
    performed_by: caller.id,
    target_user: targetId,
    action: newRole === 'admin' ? 'promote' : 'demote',
    old_role: oldRole,
    new_role: newRole,
  })

  return NextResponse.json({ ok: true, role: newRole })
}
