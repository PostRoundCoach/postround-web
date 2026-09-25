import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { claimPendingWebReferral } from '@/lib/referrals/claim'

/**
 * Handles Supabase auth redirects (password reset, email confirmation, etc.)
 * Supabase appends ?code=<pkce_code> when using PKCE flow.
 * After exchanging the code for a session, we redirect to the `next` param.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next')
  const next = requestedNext === '/reset-password' || requestedNext === '/delete-account'
    ? requestedNext : '/dashboard'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(`${origin}/login`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      try {
        await claimPendingWebReferral()
      } catch {
        // Keep the pending cookie for a later authenticated claim attempt.
      }
      // Use the site URL for production, fall back to request origin in dev
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin
      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  // Something went wrong — send back to login
  return NextResponse.redirect(`${origin}/login?error=invalid_link`)
}
