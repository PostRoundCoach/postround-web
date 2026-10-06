import 'server-only'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { REFERRAL_UUID } from './state'


export async function claimPendingWebReferral(): Promise<'none' | 'claimed' | 'invalid'> {
  const store = await cookies()
  const evidence = store.get('pr_ref')?.value
  if (!evidence) return 'none'
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Authentication required')
  const { data: existing, error: readError } = await supabase.from('creator_attributions')
    .select('creator_id').eq('user_id', user.id)
    .abortSignal(AbortSignal.timeout(3_000)).retry(false).maybeSingle()
  if (readError) throw new Error('Referral claim is temporarily unavailable')
  if (existing) {
    store.delete('pr_ref')
    return 'claimed'
  }
  if (!REFERRAL_UUID.test(evidence)) {
    store.delete('pr_ref')
    return 'invalid'
  }
  const { data, error } = await supabase.rpc('claim_creator_referral', {
    evidence_id: evidence,
    claim_method: 'web_referral',
  })
  if (error) {
    // Invalid/expired evidence is terminal; transient database failures keep the cookie retryable.
    if (error.code === '22023') {
      store.delete('pr_ref')
      return 'invalid'
    }
    throw new Error('Referral claim is temporarily unavailable')
  }
  if (!data?.length) {
    // An event already consumed by another account cannot be replayed.
    store.delete('pr_ref')
    return 'invalid'
  }
  store.delete('pr_ref')
  return 'claimed'
}