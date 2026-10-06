'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isReferralStatus, type ReferralStatus } from '@/lib/referrals/state'
import { SignupConfirmationView } from './SignupConfirmationView'

const MAX_RETRIES = 3

export function SignupConfirmation({ initialStatus, storeUrl }: {
  initialStatus: ReferralStatus
  storeUrl: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [busy, setBusy] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const locked = useRef(false)
  const mountedAttempt = useRef(false)

  const check = useCallback(async (claim: boolean) => {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      const response = await fetch(claim ? '/referrals/claim' : '/referrals/status', {
        method: claim ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(10_000),
      })
      if (response.status === 401) {
        router.replace('/login')
        return
      }
      const body = await response.json()
      if (!response.ok || !isReferralStatus(body.status)) {
        setStatus(claim ? 'pending' : 'unavailable')
      } else {
        setStatus(body.status)
        // A recovered read can expose preserved evidence. Claim only after that read.
        if (!claim && (body.status === 'pending' || body.status === 'invalid')) {
          locked.current = false
          await check(true)
        }
      }
    } catch {
      setStatus(claim ? 'pending' : 'unavailable')
    } finally {
      locked.current = false
      setBusy(false)
    }
  }, [router])

  useEffect(() => {
    if (mountedAttempt.current) return
    mountedAttempt.current = true
    if (initialStatus === 'pending' || initialStatus === 'invalid') void check(true)
  }, [check, initialStatus])

  const retry = () => {
    if (busy || attempts >= MAX_RETRIES) return
    setAttempts((count) => count + 1)
    void check(status === 'pending')
  }

  return <SignupConfirmationView status={status} storeUrl={storeUrl} busy={busy}
    canRetry={(status === 'pending' || status === 'unavailable') && attempts < MAX_RETRIES}
    onRetry={retry} />
}
