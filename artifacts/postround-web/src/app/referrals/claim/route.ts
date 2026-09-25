import { NextRequest, NextResponse } from 'next/server'
import { claimPendingWebReferral } from '@/lib/referrals/claim'

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  try {
    const result = await claimPendingWebReferral()
    return NextResponse.json({ result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error && error.message === 'Authentication required'
        ? 'Authentication required' : 'Referral claim is temporarily unavailable' },
      { status: error instanceof Error && error.message === 'Authentication required' ? 401 : 503 },
    )
  }
}