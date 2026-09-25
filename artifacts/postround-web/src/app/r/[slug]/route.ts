import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidCreatorSlug } from '@/lib/public-creators/contracts'
import { referralDestination, referralPlatform } from '@/lib/referrals/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isValidCreatorSlug(slug)) return new NextResponse('Not found', { status: 404 })

  const platform = referralPlatform(request.headers.get('user-agent') ?? '')
  let evidence: string | null = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('issue_creator_referral', {
      requested_slug: slug,
      requested_platform: platform,
    })
    if (error) return new NextResponse('Referral temporarily unavailable', { status: 503 })
    evidence = data
  } catch {
    return new NextResponse('Referral temporarily unavailable', { status: 503 })
  }
  if (!evidence) return new NextResponse('Not found', { status: 404 })

  const destination = referralDestination(platform, evidence)
  const response = NextResponse.redirect(new URL(destination, request.url), 302)
  response.headers.set('Cache-Control', 'no-store')
  // The first pending click wins within this browser. The database remains authoritative.
  if (!request.cookies.has('pr_ref')) {
    response.cookies.set('pr_ref', evidence, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/', maxAge: 30 * 24 * 60 * 60,
    })
  }
  return response
}