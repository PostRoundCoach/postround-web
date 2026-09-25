'use client'

import { useEffect } from 'react'

/** Catches a pending referral when an already-signed-in user returns to the site. */
export function PendingReferralClaim() {
  useEffect(() => {
    void fetch('/referrals/claim', { method: 'POST' }).catch(() => {
      // The HttpOnly pending cookie is retained for the next visit or reload.
    })
  }, [])
  return null
}