import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  buildVadReadModel,
  VAD_EVENT_LIMIT,
  mapFeatureToSources,
  uniqueClientRoundIds,
  type VadFilters,
  type VadDiagnosticCategory,
  type VadDiagnosticConfidence,
  type VadDiagnosticSeverity,
  type VadTelemetryRow,
} from '@/lib/vad-telemetry/read-model'
import { classifyVadSourceError } from '@/lib/vad-telemetry/source-error'

export const dynamic = 'force-dynamic'

const MAX_FILTER_LENGTH = 160
const MAX_SESSION_ID_LENGTH = 120
const DERIVED_SESSION_KEY = /^session-[0-9a-f]{8}-[0-9a-f]{8}$/
const SAFE_PROFILE = /^[A-Za-z0-9 _.-]+$/
const CATEGORIES = new Set<VadDiagnosticCategory>(['environmental', 'vad_behavior', 'audio_device', 'context', 'unknown'])
const SEVERITIES = new Set<VadDiagnosticSeverity>(['info', 'low', 'medium', 'high', 'critical'])
const CONFIDENCES = new Set<VadDiagnosticConfidence>(['low', 'medium', 'high'])

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
  const requestedProfile = boundedParam(searchParams.get('profile'))
  const category = boundedParam(searchParams.get('category')) as VadDiagnosticCategory | null
  const severity = boundedParam(searchParams.get('severity')) as VadDiagnosticSeverity | null
  const confidence = boundedParam(searchParams.get('confidence')) as VadDiagnosticConfidence | null

  return {
    start: parseDateParam(searchParams.get('start')),
    end: parseDateParam(searchParams.get('end')),
    profile: requestedProfile && SAFE_PROFILE.test(requestedProfile) ? requestedProfile : null,
    feature: feature === 'round-buddy' || feature === 'coaching' ? feature : null,
    termination: boundedParam(searchParams.get('termination')),
    anomaliesOnly: searchParams.get('anomaliesOnly') === 'true',
    sessionId: boundedParam(searchParams.get('sessionId'), MAX_SESSION_ID_LENGTH),
    category: category && CATEGORIES.has(category) ? category : null,
    subtype: boundedParam(searchParams.get('subtype')),
    severity: severity && SEVERITIES.has(severity) ? severity : null,
    confidence: confidence && CONFIDENCES.has(confidence) ? confidence : null,
    audioRoute: boundedParam(searchParams.get('audioRoute')),
    platform: boundedParam(searchParams.get('platform')),
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

  const selectColumns =
    'id,user_id,client_round_id,hole_number,source,event_type,created_at,metadata'

  let query = serviceClient
    .from('vad_telemetry_events')
    .select(selectColumns)
    .order('created_at', { ascending: false })

  if (filters.start) query = query.gte('created_at', filters.start)
  if (filters.end) query = query.lte('created_at', filters.end)
  if (filters.profile) {
    query = query.or(
      `metadata->>profile.eq."${filters.profile}",metadata->>vadProfile.eq."${filters.profile}"`
    )
  }
  if (filters.feature) query = query.in('source', mapFeatureToSources(filters.feature))
  if (filters.sessionId && !DERIVED_SESSION_KEY.test(filters.sessionId)) {
    query = query.eq('client_round_id', filters.sessionId)
  }

  let data
  let sourceError

  if (filters.profile) {
    const { data: profileRows, error: profileError } = await query.limit(VAD_EVENT_LIMIT)
    if (profileError) {
      sourceError = profileError
    } else {
      const matchingClientRoundIds = uniqueClientRoundIds(profileRows ?? []).slice(0, VAD_EVENT_LIMIT)

      if (matchingClientRoundIds.length > 0) {
        let sessionQuery = serviceClient
          .from('vad_telemetry_events')
          .select(selectColumns)
          .in('client_round_id', matchingClientRoundIds)
          .order('created_at', { ascending: false })
          .limit(VAD_EVENT_LIMIT)

        if (filters.start) sessionQuery = sessionQuery.gte('created_at', filters.start)
        if (filters.end) sessionQuery = sessionQuery.lte('created_at', filters.end)
        if (filters.feature) sessionQuery = sessionQuery.in('source', mapFeatureToSources(filters.feature))

        const sessionResult = await sessionQuery
        data = sessionResult.data
        sourceError = sessionResult.error
      } else {
        data = []
      }
    }
  } else {
    const result = await query.limit(VAD_EVENT_LIMIT)
    data = result.data
    sourceError = result.error
  }

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