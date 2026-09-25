import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { getDashboardCreatorProfile } from '@/lib/creator-stories/server-profile'
import { PendingReferralClaim } from '@/components/auth/PendingReferralClaim'

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

  const hasCreatorProfile = Boolean(await getDashboardCreatorProfile())

  return (
    <DashboardShell user={user} hasCreatorProfile={hasCreatorProfile}>
      <PendingReferralClaim />
      {children}
    </DashboardShell>
  )
}
