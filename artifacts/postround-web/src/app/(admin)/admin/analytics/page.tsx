'use client'

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  Filter,
  ListFilter,
  Mic2,
  RefreshCw,
  Search,
  ServerOff,
  ShieldAlert,
  Smartphone,
  TimerReset,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type SourceState = 'ready' | 'unavailable' | 'degraded' | string

type VadFilters = {
  start: string | null
  end: string | null
  profile: string | null
  feature: string | null
  termination: string | null
  anomaliesOnly: boolean
  sessionId: string | null
  category: string | null
  subtype: string | null
  severity: string | null
  confidence: string | null
  audioRoute: string | null
  platform: string | null
}

type VadSummary = {
  sessions: number | null
  automaticEndPercent: number | null
  manualPercent: number | null
  failures: number | null
  anomalies: number | null
  averageDurationSeconds: number | null
  availableMetrics: string[]
}

type ProfileBreakdown = {
  profile: string
  sessions: number | null
  automaticEndPercent: number | null
  manualPercent: number | null
  failures: number | null
  anomalies: number | null
}

type VadEvent = {
  id?: string | null
  name: string
  timestamp: string | null
  sequence?: number | null
  payload?: unknown
  severity?: string | null
  classification?: VadClassification | null
}

type VadClassification = {
  eventId: string
  eventName: string
  timestamp: string | null
  category: string
  subtype: string
  detection: string
  likelyCause: string
  vadImpact: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  confidence: 'low' | 'medium' | 'high'
  explanation: string
  evidence: Record<string, unknown>
}

type VadCoachingDiagnostics = {
  hasCoachingEvents: boolean
  coachingSessionId: string | null
  environment: {
    audioInputRoute: string | null
    audioOutputRoute: string | null
    vadProfile: string | null
  }
  vadState: {
    noiseFloor: number | null
    adaptiveThreshold: number | null
    speechState: string | null
    speechStreak: number | null
  }
  silence: {
    silenceTimerState: string | null
    silenceTimerCancellations: number | null
  }
  meterWindows: Array<{
    sampleWindowStart: string | null
    sampleWindowEnd: string | null
    sampleCount: number | null
    minMetering: number | null
    maxMetering: number | null
    averageMetering: number | null
    thresholdCrossingCount: number | null
    silenceTimerCancellationCount: number | null
  }>
  routeChanges: Array<Record<string, unknown>>
  anomalies: Array<Record<string, unknown>>
}

type VadSession = {
  id: string
  clientRoundId: string
  timestamp: string | null
  feature: string | null
  profile: string | null
  environment: string | null
  platform?: string | null
  audioRoute?: string | null
  device: string | null
  durationSeconds: number | null
  termination: string | null
  hasAnomaly: boolean | null
  hasFailure: boolean | null
  coachingSessionId?: string | null
  coachingDiagnostics?: VadCoachingDiagnostics
  classifications: VadClassification[]
}

type VadSessionDetail = VadSession & {
  events: VadEvent[]
}

type VadResponse = {
  status: 'ready' | 'unavailable' | string
  source: {
    state: SourceState
    label: string
    detail: string
    missingCapabilities?: string[]
  }
  filters: VadFilters
  summary: VadSummary
  filterOptions: {
    profiles: string[]
    features: string[]
    terminationCategories: string[]
    categories: string[]
    subtypes: string[]
    severities: string[]
    confidences: string[]
    audioRoutes: string[]
    platforms: string[]
  }
  profiles: ProfileBreakdown[]
  sessions: VadSession[]
  selectedSession: VadSessionDetail | null
  pagination: {
    page: number
    limit: number
    total: number | null
    hasMore: boolean
  }
}

type FilterState = {
  start: string
  end: string
  profile: string
  feature: string
  termination: string
  anomaliesOnly: boolean
  sessionId: string
  category: string
  subtype: string
  severity: string
  confidence: string
  audioRoute: string
  platform: string
}

const REQUESTED_FEATURES = [
  { value: 'round-buddy', label: 'Round Buddy' },
  { value: 'coaching', label: 'Coaching' },
]

const EMPTY_SUMMARY: VadSummary = {
  sessions: null,
  automaticEndPercent: null,
  manualPercent: null,
  failures: null,
  anomalies: null,
  averageDurationSeconds: null,
  availableMetrics: [],
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatMetric(value: number | null, suffix = ''): string {
  return value == null ? 'Unavailable' : `${value}${suffix}`
}

function formatFeature(value: string | null): string {
  if (value === 'round-buddy') return 'Round Buddy'
  if (value === 'coaching') return 'Coaching'
  return value || 'Unavailable'
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return 'Unavailable'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return `${minutes}m ${remaining}s`
}

function formatPayload(payload: unknown): string {
  if (payload == null) return 'No payload stored'
  if (typeof payload === 'string') return payload
  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return 'Payload could not be displayed'
  }
}

function formatDiagnosticValue(value: unknown): string {
  if (value == null || value === '') return 'Unavailable'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return formatPayload(value)
  return String(value)
}

function formatDiagnosticLabel(value: string): string {
  if (value === 'vad_behavior') return 'VAD Behavior'
  if (value === 'audio_device') return 'Audio / Device'
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const SEVERITY_RANK: Record<VadClassification['severity'], number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

function primaryClassification(session: VadSession): VadClassification | null {
  return [...(session.classifications ?? [])].sort(
    (left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
  )[0] ?? null
}

function sessionSignal(session: VadSession): { label: string; variant: 'destructive' | 'secondary' } {
  if (session.hasFailure) return { label: 'Failure', variant: 'destructive' }
  if (session.hasAnomaly) return { label: 'Anomaly', variant: 'destructive' }
  return { label: 'No flags', variant: 'secondary' }
}

function severityClass(severity: VadClassification['severity']): string {
  if (severity === 'critical' || severity === 'high') return 'border-destructive/40 bg-destructive/10 text-destructive'
  if (severity === 'medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-800'
  return 'border-[#1B5E35]/25 bg-[#1B5E35]/5 text-[#1B5E35]'
}

function eventSignal(event: VadEvent): boolean {
  const name = event.name.toLowerCase()
  return (
    event.severity === 'error' ||
    event.severity === 'failure' ||
    name.includes('fail') ||
    name.includes('error') ||
    name.includes('anomal') ||
    name.includes('terminate') ||
    name.includes('noise') ||
    name.includes('timer') ||
    name.includes('streak') ||
    name.includes('commit') ||
    name.includes('upload') ||
    name.includes('transcript') ||
    name.includes('record') ||
    name.includes('coach_') ||
    name.includes('buddy_') ||
    name.includes('ai')
  )
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<VadResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    start: '',
    end: '',
    profile: 'all',
    feature: 'all',
    termination: 'all',
    anomaliesOnly: false,
    sessionId: '',
    category: 'all',
    subtype: 'all',
    severity: 'all',
    confidence: 'all',
    audioRoute: 'all',
    platform: 'all',
  })

  const fetchDiagnostics = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (filters.start) params.set('start', new Date(filters.start).toISOString())
    if (filters.end) params.set('end', new Date(filters.end).toISOString())
    if (filters.profile !== 'all') params.set('profile', filters.profile)
    if (filters.feature !== 'all') params.set('feature', filters.feature)
    if (filters.termination !== 'all') params.set('termination', filters.termination)
    if (filters.anomaliesOnly) params.set('anomaliesOnly', 'true')
    if (filters.sessionId.trim()) params.set('sessionId', filters.sessionId.trim())
    if (filters.category !== 'all') params.set('category', filters.category)
    if (filters.subtype !== 'all') params.set('subtype', filters.subtype)
    if (filters.severity !== 'all') params.set('severity', filters.severity)
    if (filters.confidence !== 'all') params.set('confidence', filters.confidence)
    if (filters.audioRoute !== 'all') params.set('audioRoute', filters.audioRoute)
    if (filters.platform !== 'all') params.set('platform', filters.platform)

    try {
      const response = await fetch(`/admin-data/vad-diagnostics?${params.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
      })
      const body = (await response.json()) as Partial<VadResponse> & { error?: string }
      if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
      setData({
        status: body.status ?? 'unavailable',
        source: body.source ?? {
          state: 'unavailable',
          label: 'VAD telemetry unavailable',
          detail: 'The diagnostics source did not return source metadata.',
        },
        filters: body.filters ?? {
          start: null,
          end: null,
          profile: null,
          feature: null,
          termination: null,
          anomaliesOnly: false,
          sessionId: null,
          category: null,
          subtype: null,
          severity: null,
          confidence: null,
          audioRoute: null,
          platform: null,
        },
        summary: body.summary ?? EMPTY_SUMMARY,
        filterOptions: body.filterOptions ?? {
          profiles: [],
          features: [],
          terminationCategories: [],
          categories: [],
          subtypes: [],
          severities: [],
          confidences: [],
          audioRoutes: [],
          platforms: [],
        },
        profiles: body.profiles ?? [],
        sessions: body.sessions ?? [],
        selectedSession: body.selectedSession ?? null,
        pagination: body.pagination ?? { page: 1, limit: 50, total: null, hasMore: false },
      })
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      setError(requestError instanceof Error ? requestError.message : 'Failed to load diagnostics.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const controller = new AbortController()
    void fetchDiagnostics(controller.signal)
    return () => controller.abort()
  }, [fetchDiagnostics])

  const isUnavailable = data?.status === 'unavailable' || data?.source.state === 'unavailable'
  const profileOptions = data?.filterOptions.profiles ?? []
  const terminationOptions = data?.filterOptions.terminationCategories ?? []
  const selectedSession = data?.selectedSession
  const activeFilterCount = useMemo(
    () =>
      [filters.start, filters.end, filters.profile, filters.feature, filters.termination, filters.sessionId, filters.category, filters.subtype, filters.severity, filters.confidence, filters.audioRoute, filters.platform].filter(
        (value) => value && value !== 'all'
      ).length + (filters.anomaliesOnly ? 1 : 0),
    [filters]
  )

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilters() {
    setFilters({
      start: '',
      end: '',
      profile: 'all',
      feature: 'all',
      termination: 'all',
      anomaliesOnly: false,
      sessionId: '',
      category: 'all',
      subtype: 'all',
      severity: 'all',
      confidence: 'all',
      audioRoute: 'all',
      platform: 'all',
    })
  }

  function selectSession(sessionId: string) {
    updateFilter('sessionId', sessionId)
    document.getElementById('detail-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSessionKeyDown(event: KeyboardEvent<HTMLTableRowElement>, sessionId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectSession(sessionId)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#1B5E35]">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Admin analytics
          </div>
          <h1 className="mb-1 font-serif text-3xl font-bold text-foreground" data-testid="heading-vad-diagnostics">
            VAD Diagnostics
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground" data-testid="text-vad-diagnostics-description">
            Understand what happened during a Round Buddy or Coaching recording using stored session and application events.
          </p>
        </div>
        {data && (
          <Badge
            variant={isUnavailable ? 'destructive' : 'default'}
            className="gap-1.5 self-start px-3 py-1.5"
            data-testid="status-vad-source"
          >
            {isUnavailable ? <ServerOff className="h-4 w-4" aria-hidden="true" /> : <Activity className="h-4 w-4" aria-hidden="true" />}
            {data.source.label}
          </Badge>
        )}
      </header>

      {data?.source && (
        <Card className={isUnavailable ? 'border-destructive/30 bg-destructive/5' : 'border-[#1B5E35]/20 bg-[#1B5E35]/5'} data-testid="card-source-status">
          <CardContent className="flex items-start gap-3 p-4">
            {isUnavailable ? (
              <ServerOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1B5E35]" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="font-semibold" data-testid="text-source-status-label">{data.source.label}</p>
              <p className="mt-1 text-sm text-muted-foreground" data-testid="text-source-status-detail">{data.source.detail}</p>
              {isUnavailable && data.source.missingCapabilities?.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Unsupported until a source is available: {data.source.missingCapabilities.join(', ')}.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="border-destructive/50 bg-destructive/5" data-testid="card-vad-error">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-semibold text-destructive">Could not load diagnostics</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button className="mt-4" variant="outline" size="sm" onClick={() => void fetchDiagnostics()} data-testid="button-vad-retry">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-labelledby="filters-heading">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle id="filters-heading" className="flex items-center gap-2 text-base">
                      <Filter className="h-4 w-4 text-[#1B5E35]" aria-hidden="true" />
                      Test filters
                    </CardTitle>
                    <CardDescription className="mt-1">Combine filters to isolate a recording when telemetry is available.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0} data-testid="button-clear-vad-filters">
                    Clear {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FilterField label="From" htmlFor="vad-start">
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input id="vad-start" type="datetime-local" value={filters.start} onChange={(event) => updateFilter('start', event.target.value)} className="pl-9" data-testid="input-vad-start" />
                  </div>
                </FilterField>
                <FilterField label="To" htmlFor="vad-end">
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input id="vad-end" type="datetime-local" value={filters.end} onChange={(event) => updateFilter('end', event.target.value)} className="pl-9" data-testid="input-vad-end" />
                  </div>
                </FilterField>
                <FilterField label="VAD profile" htmlFor="vad-profile">
                  <Select value={filters.profile} onValueChange={(value) => updateFilter('profile', value)} disabled={profileOptions.length === 0}>
                    <SelectTrigger id="vad-profile" data-testid="select-vad-profile">
                      <SelectValue placeholder={profileOptions.length ? 'All profiles' : 'Unavailable'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All profiles</SelectItem>
                      {profileOptions.map((profile) => <SelectItem key={profile} value={profile}>{profile}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Feature" htmlFor="vad-feature">
                  <Select value={filters.feature} onValueChange={(value) => updateFilter('feature', value)}>
                    <SelectTrigger id="vad-feature" data-testid="select-vad-feature"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All features</SelectItem>
                      {(data?.filterOptions.features.length ? data.filterOptions.features.map((feature) => ({ value: feature, label: formatFeature(feature) })) : REQUESTED_FEATURES).map((feature) => (
                        <SelectItem key={feature.value} value={feature.value}>{feature.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Termination category" htmlFor="vad-termination">
                  <Select value={filters.termination} onValueChange={(value) => updateFilter('termination', value)} disabled={terminationOptions.length === 0}>
                    <SelectTrigger id="vad-termination" data-testid="select-vad-termination">
                      <SelectValue placeholder={terminationOptions.length ? 'All categories' : 'Unavailable'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {terminationOptions.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterField>
                <DiagnosticFilter
                  id="vad-category"
                  label="Diagnostic category"
                  value={filters.category}
                  options={data?.filterOptions.categories ?? []}
                  onChange={(value) => updateFilter('category', value)}
                />
                <DiagnosticFilter
                  id="vad-subtype"
                  label="Diagnostic subtype"
                  value={filters.subtype}
                  options={data?.filterOptions.subtypes ?? []}
                  onChange={(value) => updateFilter('subtype', value)}
                />
                <DiagnosticFilter
                  id="vad-severity"
                  label="Severity"
                  value={filters.severity}
                  options={data?.filterOptions.severities ?? []}
                  onChange={(value) => updateFilter('severity', value)}
                />
                <DiagnosticFilter
                  id="vad-confidence"
                  label="Confidence"
                  value={filters.confidence}
                  options={data?.filterOptions.confidences ?? []}
                  onChange={(value) => updateFilter('confidence', value)}
                />
                <DiagnosticFilter
                  id="vad-audio-route"
                  label="Audio route"
                  value={filters.audioRoute}
                  options={data?.filterOptions.audioRoutes ?? []}
                  onChange={(value) => updateFilter('audioRoute', value)}
                />
                <DiagnosticFilter
                  id="vad-platform"
                  label="Platform"
                  value={filters.platform}
                  options={data?.filterOptions.platforms ?? []}
                  onChange={(value) => updateFilter('platform', value)}
                />
                <FilterField label="Session ID" htmlFor="vad-session-id">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input id="vad-session-id" value={filters.sessionId} onChange={(event) => updateFilter('sessionId', event.target.value)} placeholder="Search exact ID" className="pl-9" data-testid="input-vad-session-id" />
                  </div>
                </FilterField>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-3 py-2.5 sm:col-span-2 xl:col-span-2">
                  <div>
                    <Label htmlFor="vad-anomalies-only" className="font-medium">Anomalies only</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Only show sessions with stored anomaly or failure flags.</p>
                  </div>
                  <Switch id="vad-anomalies-only" checked={filters.anomaliesOnly} onCheckedChange={(checked) => updateFilter('anomaliesOnly', checked)} data-testid="switch-vad-anomalies-only" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="health-heading">
            <div className="mb-3 flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-[#1B5E35]" aria-hidden="true" />
              <h2 id="health-heading" className="font-serif text-xl font-semibold">Health summary</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Sessions" value={data?.summary.sessions ?? null} icon={Database} loading={loading} testId="metric-vad-sessions" />
              <MetricCard label="Automatic end" value={data?.summary.automaticEndPercent ?? null} suffix="%" icon={TimerReset} loading={loading} testId="metric-vad-automatic-end" />
              <MetricCard label="Manual end" value={data?.summary.manualPercent ?? null} suffix="%" icon={Clock3} loading={loading} testId="metric-vad-manual-end" />
              <MetricCard label="Failures" value={data?.summary.failures ?? null} icon={XCircle} danger loading={loading} testId="metric-vad-failures" />
              <MetricCard label="Anomalies" value={data?.summary.anomalies ?? null} icon={ShieldAlert} danger loading={loading} testId="metric-vad-anomalies" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground" data-testid="text-vad-metric-disclaimer">
              Values show only metrics explicitly supported by the connected telemetry source. “Unavailable” is not a zero.
            </p>
          </section>

          <div className="grid gap-6 xl:grid-cols-5">
            <section className="xl:col-span-2" aria-labelledby="profiles-heading">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle id="profiles-heading" className="text-base">Profile breakdown</CardTitle>
                  <CardDescription>Canonical VAD profiles returned by the source.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? <TableLoading rows={3} columns={6} /> : data?.profiles.length ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Profile</TableHead><TableHead>Sessions</TableHead><TableHead>Auto</TableHead><TableHead>Manual</TableHead><TableHead>Failures</TableHead><TableHead>Anomalies</TableHead></TableRow></TableHeader>
                      <TableBody>{data.profiles.map((profile) => (
                        <TableRow key={profile.profile} data-testid={`row-vad-profile-${profile.profile}`}>
                          <TableCell className="font-medium">{profile.profile}</TableCell>
                          <TableCell>{formatMetric(profile.sessions)}</TableCell>
                          <TableCell>{formatMetric(profile.automaticEndPercent, '%')}</TableCell>
                          <TableCell>{formatMetric(profile.manualPercent, '%')}</TableCell>
                          <TableCell>{formatMetric(profile.failures)}</TableCell>
                          <TableCell>{formatMetric(profile.anomalies)}</TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                  ) : <UnavailablePanel icon={Mic2} title={isUnavailable ? 'Profiles unavailable' : 'No profiles found'} detail={isUnavailable ? 'No canonical VAD profile representation is available to display.' : 'The selected filters returned no profile records.'} testId="empty-vad-profiles" />}
                </CardContent>
              </Card>
            </section>

            <section className="xl:col-span-3" aria-labelledby="sessions-heading">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle id="sessions-heading" className="text-base">Recent recording sessions</CardTitle>
                      <CardDescription>Round Buddy and Coaching sessions, bounded to the latest source results.</CardDescription>
                    </div>
                    {data?.pagination.total != null && <Badge variant="outline">{data.pagination.total} total</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? <TableLoading rows={4} columns={9} /> : data?.sessions.length ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Session</TableHead><TableHead>Time</TableHead><TableHead>Feature</TableHead><TableHead>Profile</TableHead><TableHead>Context</TableHead><TableHead>Duration</TableHead><TableHead>Termination</TableHead><TableHead>Diagnosis</TableHead><TableHead>Flags</TableHead></TableRow></TableHeader>
                        <TableBody>{data.sessions.map((session) => {
                          const signal = sessionSignal(session)
                          const diagnosis = primaryClassification(session)
                          return (
                            <TableRow
                              key={session.id}
                              className="cursor-pointer focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              data-testid={`row-vad-session-${session.id}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => selectSession(session.id)}
                              onKeyDown={(event) => handleSessionKeyDown(event, session.id)}
                            >
                               <TableCell className="font-mono text-xs">{session.clientRoundId}</TableCell>
                              <TableCell className="whitespace-nowrap text-xs">{formatDateTime(session.timestamp)}</TableCell>
                              <TableCell>{formatFeature(session.feature)}</TableCell>
                              <TableCell>{session.profile || 'Unavailable'}</TableCell>
                              <TableCell className="min-w-32 text-xs">{session.environment || 'Unavailable'}{session.device ? ` · ${session.device}` : ''}</TableCell>
                              <TableCell>{formatDuration(session.durationSeconds)}</TableCell>
                              <TableCell>{session.termination || 'Unavailable'}</TableCell>
                               <TableCell className="min-w-48">
                                 {diagnosis ? (
                                   <div className="space-y-1">
                                     <Badge variant="outline" className={severityClass(diagnosis.severity)}>
                                       {formatDiagnosticLabel(diagnosis.category)} · {formatDiagnosticLabel(diagnosis.severity)}
                                     </Badge>
                                     <p className="text-xs text-muted-foreground">
                                       {formatDiagnosticLabel(diagnosis.subtype)} · {diagnosis.confidence} confidence
                                       {session.classifications.length > 1 ? ` · +${session.classifications.length - 1}` : ''}
                                     </p>
                                   </div>
                                 ) : <span className="text-xs text-muted-foreground">No classified events</span>}
                               </TableCell>
                              <TableCell><Badge variant={signal.variant}>{signal.label}</Badge></TableCell>
                            </TableRow>
                          )
                        })}</TableBody>
                      </Table>
                    </div>
                  ) : <UnavailablePanel icon={Search} title={isUnavailable ? 'Sessions unavailable' : 'No sessions found'} detail={isUnavailable ? 'No stored Round Buddy or Coaching sessions can be queried until the authoritative source is connected.' : 'No sessions match the current filters.'} testId="empty-vad-sessions" />}
                </CardContent>
              </Card>
            </section>
          </div>

          <section aria-labelledby="detail-heading">
            <Card>
              <CardHeader>
                <CardTitle id="detail-heading" className="flex items-center gap-2 text-base">
                  <ChevronRight className="h-4 w-4 text-[#1B5E35]" aria-hidden="true" />
                  Session diagnostics detail
                </CardTitle>
                <CardDescription>Actual stored events are shown in source order, including payloads when available.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <div className="space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-20 w-full" /></div> : selectedSession ? <SessionDetail session={selectedSession} /> : <UnavailablePanel icon={CircleAlert} title={isUnavailable ? 'Event timeline unavailable' : 'Select a session'} detail={isUnavailable ? 'No actual event names or payloads are displayed because the authoritative event source is not available.' : 'Choose a session above to inspect its chronological event timeline.'} testId="empty-vad-detail" />}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}

function FilterField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor} className="text-xs font-medium">{label}</Label>{children}</div>
}

function DiagnosticFilter({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <FilterField label={label} htmlFor={id}>
      <Select value={value} onValueChange={onChange} disabled={options.length === 0}>
        <SelectTrigger id={id} data-testid={`select-${id}`}>
          <SelectValue placeholder={options.length ? `All ${label.toLowerCase()}` : 'Unavailable'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{formatDiagnosticLabel(option)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  )
}

function MetricCard({ label, value, suffix = '', icon: Icon, loading, danger, testId }: { label: string; value: number | null; suffix?: string; icon: typeof Database; loading: boolean; danger?: boolean; testId: string }) {
  return (
    <Card data-testid={`card-${testId}`}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-destructive/10' : 'bg-[#1B5E35]/10'}`}>
          <Icon className={`h-5 w-5 ${danger ? 'text-destructive' : 'text-[#1B5E35]'}`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="mt-1 h-7 w-20" /> : <p className="mt-1 text-xl font-bold" data-testid={testId}>{formatMetric(value, suffix)}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function TableLoading({ rows, columns }: { rows: number; columns: number }) {
  return <div className="space-y-3 p-4">{Array.from({ length: rows }).map((_, row) => <div className="flex gap-3" key={row}>{Array.from({ length: columns }).map((__, column) => <Skeleton className="h-5 flex-1" key={column} />)}</div>)}</div>
}

function UnavailablePanel({ icon: Icon, title, detail, testId }: { icon: typeof Search; title: string; detail: string; testId: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center" data-testid={testId}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted/60"><Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" /></div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function SessionDetail({ session }: { session: VadSessionDetail }) {
  const coaching = session.coachingDiagnostics
  return (
    <div className="space-y-5" data-testid={`detail-vad-session-${session.id}`}>
      <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
         <DetailItem icon={Database} label="Client round ID" value={session.clientRoundId} mono />
        {session.coachingSessionId && <DetailItem icon={Database} label="Coaching session ID" value={session.coachingSessionId} mono />}
        <DetailItem icon={CalendarClock} label="Timestamp" value={formatDateTime(session.timestamp)} />
        <DetailItem icon={Mic2} label="Feature / profile" value={`${formatFeature(session.feature)} / ${session.profile || 'Unavailable'}`} />
        <DetailItem icon={Smartphone} label="Environment / device" value={`${session.environment || 'Unavailable'} / ${session.device || 'Unavailable'}`} />
        <DetailItem icon={Clock3} label="Duration" value={formatDuration(session.durationSeconds)} />
        <DetailItem icon={Activity} label="Termination" value={session.termination || 'Unavailable'} />
      </div>
      {session.classifications?.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold">Diagnostic classifications</h3>
          <div className="grid gap-3 lg:grid-cols-2" data-testid="vad-classification-summary">
            {session.classifications.map((item) => <ClassificationCard key={item.eventId} classification={item} />)}
          </div>
        </section>
      )}
      {coaching?.hasCoachingEvents && <CoachingDiagnostics diagnostics={coaching} />}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Stored event timeline</h3>
        {session.events.length ? (
          <ol className="space-y-3 border-l border-border pl-4" data-testid="list-vad-events">
            {session.events.map((event, index) => {
              const highlighted = eventSignal(event)
              return (
                <li key={event.id ?? `${event.name}-${event.sequence ?? index}`} className={`relative rounded-lg border p-3 ${highlighted ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-border bg-background'}`} data-testid={`event-vad-${event.id ?? index}`}>
                  <span className={`absolute -left-[1.32rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-background ${highlighted ? 'bg-[#D4AF37]' : 'bg-[#52B788]'}`} aria-hidden="true" />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                     <div className="flex flex-wrap items-center gap-2">
                       <p className="font-mono text-sm font-semibold">{event.name}</p>
                       {event.classification && (
                         <Badge variant="outline" className={severityClass(event.classification.severity)}>
                           {formatDiagnosticLabel(event.classification.subtype)} · {event.classification.severity}
                         </Badge>
                       )}
                     </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(event.timestamp)}{event.sequence != null ? ` · #${event.sequence}` : ''}</span>
                  </div>
                   {event.classification && (
                     <div className="mt-3">
                       <ClassificationCard classification={event.classification} compact />
                     </div>
                   )}
                  {event.payload != null && <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">{formatPayload(event.payload)}</pre>}
                </li>
              )
            })}
          </ol>
        ) : <UnavailablePanel icon={CircleAlert} title="No stored events" detail="This session has no event records available to display." testId="empty-vad-events" />}
      </div>
    </div>
  )
}

function ClassificationCard({ classification, compact = false }: { classification: VadClassification; compact?: boolean }) {
  return (
    <article className={`rounded-lg border p-3 ${severityClass(classification.severity)}`} data-testid={`classification-${classification.eventId}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{formatDiagnosticLabel(classification.subtype)}</p>
        <Badge variant="outline">{formatDiagnosticLabel(classification.category)}</Badge>
        <Badge variant="outline">{formatDiagnosticLabel(classification.severity)}</Badge>
        <span className="text-xs font-medium">{formatDiagnosticLabel(classification.confidence)} confidence</span>
      </div>
      <p className="mt-2 text-sm">{classification.explanation}</p>
      <dl className={`mt-3 grid gap-2 text-xs ${compact ? 'sm:grid-cols-3' : ''}`}>
        <div><dt className="font-semibold">Detection</dt><dd className="mt-0.5">{classification.detection}</dd></div>
        <div><dt className="font-semibold">Likely cause</dt><dd className="mt-0.5">{classification.likelyCause}</dd></div>
        <div><dt className="font-semibold">VAD impact</dt><dd className="mt-0.5">{classification.vadImpact}</dd></div>
      </dl>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold">Stored evidence</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-background/80 p-2 text-xs">{formatPayload(classification.evidence)}</pre>
      </details>
    </article>
  )
}

function CoachingDiagnostics({ diagnostics }: { diagnostics: VadCoachingDiagnostics }) {
  return (
    <section className="space-y-4 rounded-lg border border-[#1B5E35]/20 bg-[#1B5E35]/5 p-4" data-testid="coaching-vad-diagnostics">
      <div>
        <h3 className="text-sm font-semibold">Coaching VAD context</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Structured Coaching telemetry preserved from the canonical event payload.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DiagnosticGroup
          title="Audio environment"
          items={[
            ['Input route', diagnostics.environment.audioInputRoute],
            ['Output route', diagnostics.environment.audioOutputRoute],
            ['VAD profile', diagnostics.environment.vadProfile],
          ]}
        />
        <DiagnosticGroup
          title="VAD state"
          items={[
            ['Noise floor', diagnostics.vadState.noiseFloor],
            ['Adaptive threshold', diagnostics.vadState.adaptiveThreshold],
            ['Speech state', diagnostics.vadState.speechState],
            ['Speech streak', diagnostics.vadState.speechStreak],
          ]}
        />
        <DiagnosticGroup
          title="Silence behavior"
          items={[
            ['Timer state', diagnostics.silence.silenceTimerState],
            ['Timer cancellations', diagnostics.silence.silenceTimerCancellations],
          ]}
        />
      </div>
      {diagnostics.meterWindows.length > 0 && (
        <div data-testid="coaching-meter-windows">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aggregated COACH_METER windows</h4>
          <div className="grid gap-2 lg:grid-cols-2">
            {diagnostics.meterWindows.map((window, index) => (
              <div key={`${window.sampleWindowStart ?? 'window'}-${index}`} className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-border bg-background p-3 text-xs sm:grid-cols-4">
                <DiagnosticValue label="Samples" value={window.sampleCount} />
                <DiagnosticValue label="Min" value={window.minMetering} />
                <DiagnosticValue label="Max" value={window.maxMetering} />
                <DiagnosticValue label="Average" value={window.averageMetering} />
                <DiagnosticValue label="Threshold crossings" value={window.thresholdCrossingCount} />
                <DiagnosticValue label="Timer cancellations" value={window.silenceTimerCancellationCount} />
                <DiagnosticValue label="Window start" value={window.sampleWindowStart} />
                <DiagnosticValue label="Window end" value={window.sampleWindowEnd} />
              </div>
            ))}
          </div>
        </div>
      )}
      {diagnostics.routeChanges.length > 0 && (
        <DiagnosticRecordList title="Audio route transitions" records={diagnostics.routeChanges} testId="coaching-route-changes" />
      )}
      {diagnostics.anomalies.length > 0 && (
        <DiagnosticRecordList title="VAD anomalies" records={diagnostics.anomalies} testId="coaching-anomalies" />
      )}
    </section>
  )
}

function DiagnosticGroup({ title, items }: { title: string; items: Array<[string, unknown]> }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <dl className="space-y-1.5 text-xs">
        {items.map(([label, value]) => (
          <div className="flex items-start justify-between gap-3" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{formatDiagnosticValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function DiagnosticValue({ label, value }: { label: string; value: unknown }) {
  return <div><p className="text-muted-foreground">{label}</p><p className="mt-0.5 font-medium">{formatDiagnosticValue(value)}</p></div>
}

function DiagnosticRecordList({ title, records, testId }: { title: string; records: Array<Record<string, unknown>>; testId: string }) {
  return (
    <div data-testid={testId}>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="space-y-2">
        {records.map((record, index) => (
          <pre key={index} className="overflow-auto rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">{formatPayload(record)}</pre>
        ))}
      </div>
    </div>
  )
}

function DetailItem({ icon: Icon, label, value, mono }: { icon: typeof Database; label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</p><p className={`mt-1 truncate text-sm ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p></div>
}
