import { NextRequest, NextResponse } from 'next/server'
import { claimPendingWebReferral } from '@/lib/referrals/claim'
import { createClient } from '@/lib/supabase/server'
import { readReferralStatus } from '@/lib/referrals/status'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  const hasPending = (await cookies()).has('pr_ref')
  try {
    const result = await claimPendingWebReferral()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Authentication required')
    const status = await readReferralStatus(user.id)
    return NextResponse.json(
      { result, hasPending, status: status === 'absent' && result === 'invalid' ? 'invalid' : status },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { hasPending, error: error instanceof Error && error.message === 'Authentication required'
        ? 'Authentication required' : 'Referral claim is temporarily unavailable' },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 503,
        headers: { 'Cache-Control': 'no-store' } },
    )
  }
}