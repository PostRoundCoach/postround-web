export interface SubscriptionRecord {
  subscription_plan: string | null
  subscription_status: string | null
  report_credits_remaining: number | null
}

export interface SubscriptionPresentation {
  plan: string
  status: string
  access: string
  reportBalance: string
  knownPlan: 'free' | 'player' | 'performance' | null
  subscribed: boolean
}

const planNames: Record<string, string> = {
  free: 'Free',
  player: 'Player',
  performance: 'Performance',
}

export function presentSubscription(record: SubscriptionRecord | null): SubscriptionPresentation {
  const rawPlan = record?.subscription_plan?.trim() || null
  const rawStatus = record?.subscription_status?.trim() || null
  const normalizedPlan = rawPlan?.toLowerCase() ?? null
  const knownPlan = normalizedPlan === 'free' || normalizedPlan === 'player' || normalizedPlan === 'performance'
    ? normalizedPlan : null
  const subscribed = (knownPlan === 'player' || knownPlan === 'performance')
    && (rawStatus === 'active' || rawStatus === 'trialing')

  const access = !record || !rawPlan || !rawStatus
    ? 'Subscription access unavailable'
    : !knownPlan
      ? 'Plan access unavailable — unrecognized plan'
      : knownPlan === 'free'
        ? 'Free access'
        : subscribed
          ? rawStatus === 'trialing' ? 'Subscribed access (trialing)' : 'Subscribed access (active)'
          : 'Paid access not active'

  // Reports are a separate per-profile counter. Never infer a remaining balance
  // from a plan allowance, particularly for older Free accounts.
  const balance = record?.report_credits_remaining
  const reportBalance = knownPlan === 'free' && Number.isSafeInteger(balance) && balance! >= 0
    ? `${balance} AI Round Reports remaining`
    : 'AI Round Reports remaining: unavailable'

  return {
    plan: rawPlan ? knownPlan ? planNames[knownPlan] : `${rawPlan} (unrecognized)` : 'Plan unavailable',
    status: rawStatus ?? 'Status unavailable',
    access,
    reportBalance,
    knownPlan,
    subscribed,
  }
}