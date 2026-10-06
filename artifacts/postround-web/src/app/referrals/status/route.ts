import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { readReferralStatus } from '@/lib/referrals/status'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hasPending = (await cookies()).has('pr_ref')
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return NextResponse.json(
      { hasPending, status: user ? await readReferralStatus(user.id) : null },
      { status: user ? 200 : 401, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ hasPending, status: 'unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    })
  }
}
