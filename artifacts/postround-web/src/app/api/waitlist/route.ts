import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  if (!body || !body.name || !body.email) {
    return NextResponse.json(
      { error: 'Name and email are required.' },
      { status: 400 }
    )
  }

  const { name, email } = body as { name: string; email: string }

  let supabase
  try {
    supabase = await createClient()
  } catch {
    // Supabase env vars not configured yet
    return NextResponse.json(
      { error: 'Service unavailable — please try again later.' },
      { status: 503 }
    )
  }

  const { error } = await supabase
    .from('waitlist')
    .insert({ name: name.trim(), email: email.trim().toLowerCase() })

  if (error) {
    // Unique constraint violation — email already registered
    if (error.code === '23505') {
      return NextResponse.json(
        { error: "You're already on the list! We'll be in touch." },
        { status: 409 }
      )
    }
    console.error('[waitlist] insert error:', error.message)
    return NextResponse.json(
      { error: 'Something went wrong — please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
