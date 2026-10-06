import 'server-only'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

import { referralState, type ReferralStatus } from './state'

/** Own-user RLS read, not a claim response or a browser hint, establishes success. */
export async function readReferralStatus(userId: string): Promise<ReferralStatus> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('creator_attributions')
    .select('creator_id').eq('user_id', userId)
    // Explicit page retries, not the SDK's exponential GET retries, own recovery.
    .abortSignal(AbortSignal.timeout(3_000)).retry(false).maybeSingle()
  if (error) return 'unavailable'
  const evidence = (await cookies()).get('pr_ref')?.value
  return referralState(Boolean(data), evidence)
}
