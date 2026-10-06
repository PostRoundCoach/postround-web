export type ReferralStatus = 'applied' | 'pending' | 'invalid' | 'absent' | 'unavailable'
export const REFERRAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function referralState(hasAttribution: boolean, evidence?: string): ReferralStatus {
  if (hasAttribution) return 'applied'
  return !evidence ? 'absent' : REFERRAL_UUID.test(evidence) ? 'pending' : 'invalid'
}

export function isReferralStatus(value: unknown): value is ReferralStatus {
  return typeof value === 'string' && ['applied', 'pending', 'invalid', 'absent', 'unavailable'].includes(value)
}
