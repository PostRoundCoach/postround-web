import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { fetchOwnedActiveCreatorProfile } from '@/lib/creator-stories/client'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let hasCreatorProfile = false
  try {
    hasCreatorProfile = Boolean(await fetchOwnedActiveCreatorProfile(supabase))
  } catch {
    // Eligibility is fail-closed: never expose creator navigation on lookup errors.
  }

  return (
    <DashboardShell user={user} hasCreatorProfile={hasCreatorProfile}>
      {children}
    </DashboardShell>
  )
}
