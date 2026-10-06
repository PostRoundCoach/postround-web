import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { androidStoreUrl } from '@/lib/referrals/config'
import { readReferralStatus } from '@/lib/referrals/status'
import { SignupConfirmation } from '@/components/auth/SignupConfirmation'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Welcome to Post Round', robots: { index: false, follow: false } }

export default async function SignupCompletePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  // Guard in the page itself: a layout redirect alone can serialize child content.
  if (error || !user) redirect('/login')
  const status = await readReferralStatus(user.id)
  return <SignupConfirmation initialStatus={status} storeUrl={androidStoreUrl()} />
}
