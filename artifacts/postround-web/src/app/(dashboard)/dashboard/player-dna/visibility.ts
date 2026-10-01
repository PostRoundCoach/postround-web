import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Temporary web visibility restriction, called before the preserved page renders.
// Enforce this even when middleware passes through in unconfigured local dev.
export async function hidePlayerDNAOnWeb(): Promise<never> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  redirect('/dashboard')
}