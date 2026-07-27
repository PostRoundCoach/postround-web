import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/player-dna
 *
 * Returns the authenticated user's Player DNA profile.
 * Player DNA is built from round history, patterns, and AI analysis.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Query Supabase for the user's Player DNA record
    // The schema for player_dna will be defined when the full app is built

    return NextResponse.json(
      { message: 'Player DNA endpoint — coming soon', userId: user.id },
      { status: 501 }
    )
  } catch (error) {
    console.error('[/api/player-dna]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
