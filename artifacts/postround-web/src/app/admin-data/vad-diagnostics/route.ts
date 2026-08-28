import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  buildVadReadModel,
  VAD_EVENT_LIMIT,
  mapFeatureToSources,
  type VadFilters,
  type VadTelemetryRow,
} from '@/lib/vad-telemetry/read-model'
import { classifyVadSourceError } from '@/lib/vad-telemetry/source-error'

export const dynamic = 'force-dynamic'

const MAX_FILTER_LENGTH = 160
const MAX_SESSION_ID_LENGTH = 120
const DERIVED_SESSION_KEY = /^session-[0-9a-f]{8}-[0-9a-f]{8}$/

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

function parseFilters(request: NextRequest): VadFilters {
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

  let serviceClient
  try {
    serviceClient = createServiceClient()
  } catch (error) {
    console.error('[VAD diagnostics] Telemetry source is not configured', error)
    return NextResponse.json(
      { error: 'VAD telemetry source is not configured: SUPABASE_SERVICE_ROLE_KEY is required' },
      { status: 503 }
    )
  }

  let query = serviceClient
    .from('vad_telemetry_events')
    .select(
      'id,user_id,client_round_id,hole_number,source,event_type,created_at,metadata'
    )
    .order('created_at', { ascending: false })
    .limit(VAD_EVENT_LIMIT)

  if (filters.start) query = query.gte('created_at', filters.start)
  if (filters.end) query = query.lte('created_at', filters.end)
  if (filters.profile) query = query.contains('metadata', { profile: filters.profile })
  if (filters.feature) query = query.in('source', mapFeatureToSources(filters.feature))
  if (filters.sessionId && !DERIVED_SESSION_KEY.test(filters.sessionId)) {
    query = query.eq('client_round_id', filters.sessionId)
  }

  const { data, error: sourceError } = await query
  if (sourceError) {
    console.error('[VAD diagnostics] Supabase telemetry query failed', sourceError)
    const classified = classifyVadSourceError(sourceError)
    return NextResponse.json({ error: classified.message }, { status: classified.status })
  }

  return NextResponse.json(buildVadReadModel((data ?? []) as VadTelemetryRow[], filters, filters.sessionId), {
    status: 200,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}