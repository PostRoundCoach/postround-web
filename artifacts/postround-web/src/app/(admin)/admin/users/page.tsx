import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { UserManagement, type UserRow } from '@/components/admin/UserManagement'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  // Current user (already verified as admin by the layout)
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) redirect('/login')

  // Fetch all users via service role
  let users: UserRow[] = []
  let loadError: string | null = null

  try {
    const service = createServiceClient()

    // Get all auth users (up to 1000; add pagination later if needed)
    const { data: authData, error: authError } =
      await service.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (authError) throw authError

    // Get all profiles for display names and roles
    const { data: profiles, error: profilesError } = await service
      .from('profiles')
      .select('id, display_name, role')

    if (profilesError) throw profilesError

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; display_name: string | null; role: string | null }) => [
        p.id,
        p,
      ])
    )

    users = (authData?.users ?? []).map((u) => {
      const profile = profileMap.get(u.id) as
        | { id: string; display_name: string | null; role: string | null }
        | undefined

      return {
        id: u.id,
        email: u.email ?? '(no email)',
        displayName: profile?.display_name ?? u.email ?? 'Unknown',
        role: profile?.role ?? 'user',
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
      }
    })

    // Sort: admins first, then by display name
    users.sort((a, b) => {
      const roleOrder = { admin: 0, coach: 1, user: 2 }
      const ra = roleOrder[a.role as keyof typeof roleOrder] ?? 2
      const rb = roleOrder[b.role as keyof typeof roleOrder] ?? 2
      if (ra !== rb) return ra - rb
      return a.displayName.localeCompare(b.displayName)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // If service role key is missing (common in dev), show a helpful message
    if (message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      loadError = 'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your environment variables to enable user management.'
    } else {
      loadError = message
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Users</h1>
        <p className="text-muted-foreground">
          Promote and demote user roles. Changes take effect immediately.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Could not load users</p>
            <p className="text-sm text-muted-foreground mt-1">{loadError}</p>
          </div>
        </div>
      ) : (
        <UserManagement
          initialUsers={users}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  )
}
