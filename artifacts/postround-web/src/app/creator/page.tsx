import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CreatorDashboard } from '@/components/creator/CreatorDashboard'
import { Toaster } from '@/components/ui/sonner'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Creator Studio — Post Round Coach',
  description: 'Review follower-approved golf stories and generate social content.',
  robots: { index: false, follow: false },
}

export default async function CreatorPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL
    || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <>
        <CreatorDashboard />
        <Toaster richColors position="bottom-right" />
      </>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <CreatorDashboard />
      <Toaster richColors position="bottom-right" />
    </>
  )
}
