import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/coaching
 *
 * Placeholder for the AI coaching endpoint.
 * Will process round data and generate personalized coaching insights via OpenAI.
 * Requires authenticated user — validates via Supabase session.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // TODO: Implement AI coaching logic
    // 1. Validate round data from body
    // 2. Fetch user's Player DNA from Supabase
    // 3. Call OpenAI with round context + player profile
    // 4. Parse and store coaching report in Supabase
    // 5. Return structured coaching response

    return NextResponse.json(
      { message: 'AI coaching endpoint — coming soon', userId: user.id },
      { status: 501 }
    )
  } catch (error) {
    console.error('[/api/coaching]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
