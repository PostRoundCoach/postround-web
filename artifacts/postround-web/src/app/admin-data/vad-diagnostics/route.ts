import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_FILTER_LENGTH = 160
const MAX_SESSION_ID_LENGTH = 120
const PAGE_SIZE = 50

type NormalizedFilters = {
  start: string | null
  end: string | null
  profile: string | null
  feature: string | null
  termination: string | null
  anomaliesOnly: boolean
  sessionId: string | null
}

/**
 * The web artifact currently has no authoritative VAD telemetry source.
 *
 * Keep this read model explicit rather than querying product tables such as
 * rounds or profiles. Those tables do not contain recording/session events,
 * and using them here would make the dashboard look healthy while reporting
 * unrelated data. When the shared/mobile source is available, its adapter
 * should populate this same response shape behind this protected route.
 */
const UNAVAILABLE_SOURCE = {
  state: 'unavailable',
  label: 'VAD telemetry unavailable',
  detail:
    'No authoritative VAD session, event, or profile/environment source is configured for this product.',
  missingCapabilities: [
    'session records',
    'stored application/VAD events',
    'canonical VAD profiles and environments',
    'termination, duration, anomaly, and failure fields',
  ],
} as const

function boundedParam(value: string | null, maxLength = MAX_FILTER_LENGTH): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function parseDateParam(value: string | null): string | null {
  const bounded = boundedParam(value)
  if (!bounded) return null

  const parsed = new Date(bounded)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function parseFilters(request: NextRequest): NormalizedFilters {
  const { searchParams } = request.nextUrl
  const feature = boundedParam(searchParams.get('feature'))

  return {
    start: parseDateParam(searchParams.get('start')),
    end: parseDateParam(searchParams.get('end')),
    profile: boundedParam(searchParams.get('profile')),
    feature: feature === 'round-buddy' || feature === 'coaching' ? feature : null,
    termination: boundedParam(searchParams.get('termination')),
    anomaliesOnly: searchParams.get('anomaliesOnly') === 'true',
    sessionId: boundedParam(searchParams.get('sessionId'), MAX_SESSION_ID_LENGTH),
  }
}

export async function GET(request: NextRequest) {
  let supabase

  try {
    supabase = await createClient()
  } catch (error) {
    console.error('[VAD diagnostics] Could not create auth client', error)
    return NextResponse.json({ error: 'Server authentication is not configured' }, { status: 503 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }

  const filters = parseFilters(request)

  return NextResponse.json(
    {
      status: 'unavailable',
      source: UNAVAILABLE_SOURCE,
      filters,
      summary: {
        sessions: null,
        automaticEndPercent: null,
        manualPercent: null,
        failures: null,
        anomalies: null,
        averageDurationSeconds: null,
        availableMetrics: [],
      },
      filterOptions: {
        profiles: [],
        features: [],
        terminationCategories: [],
      },
      profiles: [],
      sessions: [],
      selectedSession: null,
      pagination: {
        page: 1,
        limit: PAGE_SIZE,
        total: null,
        hasMore: false,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  )
}