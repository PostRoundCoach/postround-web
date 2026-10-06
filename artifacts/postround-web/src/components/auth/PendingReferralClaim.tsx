'use client'

import { useEffect } from 'react'

/** Catches a pending referral when an already-signed-in user returns to the site. */
export function PendingReferralClaim() {
  useEffect(() => {
    void fetch('/referrals/status', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return
      const { status } = await response.json()
      if (status === 'pending' || status === 'invalid') {
        await fetch('/referrals/claim', { method: 'POST' })
      }
    }).catch(() => {
      // The HttpOnly pending cookie is retained for the next visit or reload.
    })
  }, [])
  return null
}