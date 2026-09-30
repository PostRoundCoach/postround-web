import { createClient } from '@/lib/supabase/server'
import type { SubscriptionRecord } from './presentation'

export async function getPlayerSubscription(userId: string): Promise<SubscriptionRecord | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status, report_credits_remaining')
      .eq('id', userId)
      .single<SubscriptionRecord>()

    return error ? null : data
  } catch {
    return null
  }
}