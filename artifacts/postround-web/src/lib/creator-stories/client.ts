import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreatorProfile,
  CreatorStory,
  CreatorStoryRecord,
  CreatorContentIdea,
  PermissionedCreatorStoryRecord,
  GenerateStoryCandidatesRequest,
  GenerateStoryCandidatesResponse,
  GenerateStoryDraftRequest,
  GenerateStoryDraftResponse,
  FetchStoryCandidatesResponse,
  DismissCreatorStoryResponse,
  RequestStoryApprovalResponse,
  ScorecardHole,
  StoryCandidate,
  StoryCandidateEvidence,
  StoryTranscriptHighlight,
} from './contracts'

const CREATOR_PROFILE_SELECT = `
  id,
  display_name,
  bio,
  avatar_url,
  status,
  created_at,
  updated_at,
  creator_social_accounts(
    id,
    platform,
    handle,
    profile_url
  )
`

const CREATOR_STORY_SELECT = `
  id,
  story_type,
  headline,
  summary,
  story_data,
  round_id,
  status
`

export class CreatorStoryIntegrationError extends Error {
  constructor() {
    super('The creator workspace could not be loaded.')
    this.name = 'CreatorStoryIntegrationError'
  }
}

export class CreatorStoryApiError extends Error {
  readonly status: number
  readonly stage: string | null

  constructor(
    status: number,
    message = 'Content generation could not be completed.',
    stage: string | null = null,
  ) {
    super(message)
    this.name = 'CreatorStoryApiError'
    this.status = status
    this.stage = stage
  }
}

export class CreatorStoryConfigurationError extends Error {
  constructor() {
    super('Content generation is not available.')
    this.name = 'CreatorStoryConfigurationError'
  }
}

function contentApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL?.trim()
  if (!apiBase) throw new CreatorStoryConfigurationError()

  try {
    const url = new URL(apiBase)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== '/' && url.pathname !== '')
    ) {
      throw new CreatorStoryConfigurationError()
    }
    return url.origin
  } catch (error) {
    if (error instanceof CreatorStoryConfigurationError) throw error
    throw new CreatorStoryConfigurationError()
  }
}

function contentGenerationUrl(): string {
  return `${contentApiBase()}/api/content/generate`
}

function generatedIdeasUrl(storyId: string): string {
  const query = new URLSearchParams({ story_id: storyId })
  return `${contentApiBase()}/api/content/ideas?${query.toString()}`
}

function storyDraftUrl(): string {
  return `${contentApiBase()}/api/content/draft`
}

function revokeStoryPermissionUrl(storyId: string): string {
  return `${contentApiBase()}/api/content/stories/${encodeURIComponent(storyId)}/dismissal`
}

function requestStoryApprovalUrl(storyId: string): string {
  return `${contentApiBase()}/api/content/stories/${encodeURIComponent(storyId)}/approval-request`
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function firstString(
  data: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (!data) return null

  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

function stringList(
  data: Record<string, unknown> | null,
  keys: string[],
): string[] {
  if (!data) return []

  for (const key of keys) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      )
    }
  }

  return []
}

const ARCHETYPES = new Set([
  'Achievement', 'Drama', 'Surprise', 'Failure / Disaster', 'Insight', 'Progress',
])

function isOptionalStoredNumber(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || typeof value === 'number'
}

function toScorecardHole(value: unknown): ScorecardHole | null {
  const row = asObject(value)
  if (!row || typeof row.hole !== 'number') return null
  const numberFields = ['yards', 'par', 'score', 'chips', 'putts', 'penalties']
  const stringFields = ['fairway', 'green']
  const booleanFields = ['playable', 'sand']
  if (numberFields.some((field) => !isOptionalStoredNumber(row[field]))
    || stringFields.some((field) => row[field] !== undefined && row[field] !== null && typeof row[field] !== 'string')
    || booleanFields.some((field) => row[field] !== undefined && row[field] !== null && typeof row[field] !== 'boolean')) {
    return null
  }
  return row as unknown as ScorecardHole
}

function toStoryCandidate(value: unknown): StoryCandidate | null {
  const candidate = asObject(value)
  if (!candidate) return null
  const strings = ['id', 'story_id', 'archetype', 'title', 'hook', 'summary', 'why_interesting'] as const
  if (strings.some((field) => typeof candidate[field] !== 'string')
    || !ARCHETYPES.has(candidate.archetype as string)
    || typeof candidate.confidence !== 'number'
    || !Array.isArray(candidate.supporting_evidence)
    || !Array.isArray(candidate.relevant_holes)
    || !Array.isArray(candidate.scorecard)
    || (candidate.suggested_format !== null && candidate.suggested_format !== undefined && typeof candidate.suggested_format !== 'string')) {
    return null
  }
  const evidence = candidate.supporting_evidence
  if (!Array.isArray(evidence) || !evidence.every((item) => typeof item === 'string')) return null
  const transcriptHighlights = candidate.transcript_highlights === undefined
    ? []
    : candidate.transcript_highlights
  if (!Array.isArray(transcriptHighlights)) return null
  const highlights = transcriptHighlights.map((item): StoryTranscriptHighlight | null => {
    return typeof item === 'string' ? { excerpt: item } : null
  })
  const scorecard = candidate.scorecard.map(toScorecardHole)
  if (!candidate.relevant_holes.every((hole) => typeof hole === 'number')
    || highlights.some((item) => item === null)
    || scorecard.some((item) => item === null)) return null
  return {
    id: candidate.id as string, story_id: candidate.story_id as string,
    archetype: candidate.archetype as StoryCandidate['archetype'],
    title: candidate.title as string, hook: candidate.hook as string,
    summary: candidate.summary as string, why_interesting: candidate.why_interesting as string,
    evidence: (evidence as string[]).map((detail) => ({ label: 'Stored evidence', detail })), relevant_holes: candidate.relevant_holes as number[],
    confidence: candidate.confidence, suggested_format: candidate.suggested_format as string | null ?? null,
    transcript_highlights: highlights as StoryTranscriptHighlight[], scorecard: scorecard as ScorecardHole[],
  }
}

function toContentIdea(value: unknown): CreatorContentIdea | null {
  const idea = asObject(value)
  if (!idea) return null
  const strings = ['id', 'story_id', 'round_id', 'category', 'title', 'hook', 'script', 'status', 'created_at'] as const
  const stats = asObject(idea.stats_used)
  if (strings.some((field) => typeof idea[field] !== 'string') || !stats) return null
  return {
    id: idea.id as string,
    story_id: idea.story_id as string,
    round_id: idea.round_id as string,
    category: idea.category as string,
    title: idea.title as string,
    hook: idea.hook as string,
    script: idea.script as string,
    stats_used: stats,
    status: idea.status as string,
    created_at: idea.created_at as string,
  }
}

async function authenticatedAccessToken(supabase: SupabaseClient): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  if (sessionError || !accessToken) {
    throw new CreatorStoryApiError(401)
  }

  return accessToken
}

async function apiFailure(response: Response, fallback: string): Promise<CreatorStoryApiError> {
  let message = fallback
  let stage: string | null = null
  try {
    const payload: unknown = await response.json()
    const value = asObject(payload)
    if (typeof value?.error === 'string' && value.error.trim()) message = value.error
    if (typeof value?.stage === 'string' && value.stage.trim()) stage = value.stage
  } catch {
    // A non-JSON upstream failure still retains its HTTP status and safe fallback.
  }
  return new CreatorStoryApiError(response.status, message, stage)
}

export function toCreatorStory(
  record: CreatorStoryRecord,
  permissionStatus: CreatorStory['permissionStatus'] = 'pending',
): CreatorStory {
  const storyData = asObject(record.story_data)

  return {
    id: record.id,
    storyType: record.story_type,
    headline: record.headline,
    summary: record.summary,
    status: record.status,
    roundDate: firstString(storyData, ['round_date', 'roundDate', 'played_at', 'date']),
    course: firstString(storyData, ['course_name', 'courseName', 'course']),
    golferDisplayName: firstString(storyData, [
      'golfer_display_name',
      'golferDisplayName',
      'display_name',
    ]),
    supportingFacts: stringList(storyData, [
      'supporting_facts',
      'supportingFacts',
      'facts',
    ]),
    permissionStatus,
  }
}

export async function fetchOwnedActiveCreatorProfile(
  supabase: SupabaseClient,
): Promise<CreatorProfile | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) throw new CreatorStoryIntegrationError()
  if (!user) return null

  const { data, error } = await supabase
    .from('creator_profiles')
    .select(CREATOR_PROFILE_SELECT)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new CreatorStoryIntegrationError()
  return data as CreatorProfile | null
}

export async function fetchPermissionedCreatorStories(
  supabase: SupabaseClient,
  creatorId: string,
): Promise<CreatorStory[]> {
  const { data, error } = await supabase
    .from('story_permissions')
    .select(`
      story_id,
      granted_at,
      story_candidates!inner(
        ${CREATOR_STORY_SELECT}
      )
    `)
    .eq('creator_id', creatorId)
    .eq('permission_granted', true)
    .is('revoked_at', null)
    .in('story_candidates.status', ['offered', 'shared'])

  if (error) throw new CreatorStoryIntegrationError()

  return ((data ?? []) as PermissionedCreatorStoryRecord[]).flatMap((permission) => {
    const related = Array.isArray(permission.story_candidates)
      ? permission.story_candidates
      : [permission.story_candidates]

    return related.filter(Boolean).map((story) =>
      toCreatorStory(story, permission.granted_at ? 'approved' : 'pending'))
  })
}

export async function generateStoryCandidates(
  supabase: SupabaseClient,
  input: GenerateStoryCandidatesRequest,
  options: { signal?: AbortSignal } = {},
): Promise<GenerateStoryCandidatesResponse> {
  const accessToken = await authenticatedAccessToken(supabase)

  const response = await fetch(contentGenerationUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal: options.signal,
  })

  if (!response.ok) {
    throw await apiFailure(response, 'Content generation could not be completed.')
  }

  const payload: unknown = await response.json()
  const result = asObject(payload)

  if (result?.ok !== true
    || typeof result.count !== 'number'
    || !Array.isArray(result.candidates)
    || (result.permission_status !== 'pending' && result.permission_status !== 'approved')) {
    throw new CreatorStoryApiError(500)
  }
  const candidates = result.candidates.map(toStoryCandidate)
  if (candidates.some((candidate) => candidate === null)) throw new CreatorStoryApiError(500)
  return {
    ok: true,
    count: result.count,
    candidates: candidates as StoryCandidate[],
    permission_status: result.permission_status,
  }
}

export async function fetchStoryCandidates(
  supabase: SupabaseClient,
  storyId: string,
  options: { signal?: AbortSignal } = {},
): Promise<FetchStoryCandidatesResponse> {
  const accessToken = await authenticatedAccessToken(supabase)
  const response = await fetch(generatedIdeasUrl(storyId), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: options.signal,
  })

  if (!response.ok) {
    throw await apiFailure(response, 'Generated content could not be loaded.')
  }

  const payload: unknown = await response.json()
  const result = asObject(payload)
  if (result?.ok !== true
    || result.story_id !== storyId
    || typeof result.round_id !== 'string'
    || !Array.isArray(result.ideas)
    || (result.permission_status !== 'pending' && result.permission_status !== 'approved')) {
    throw new CreatorStoryApiError(500, 'Generated content could not be loaded.')
  }

  const ideas = result.ideas.map(toContentIdea)
  if (ideas.some((idea) => idea === null)) {
    throw new CreatorStoryApiError(500, 'Generated content could not be loaded.')
  }

  return {
    ok: true,
    story_id: storyId,
    round_id: result.round_id,
    ideas: ideas as CreatorContentIdea[],
    permission_status: result.permission_status,
  }
}

export async function generateStoryDraft(
  supabase: SupabaseClient,
  input: GenerateStoryDraftRequest,
  options: { signal?: AbortSignal } = {},
): Promise<GenerateStoryDraftResponse> {
  const accessToken = await authenticatedAccessToken(supabase)
  const response = await fetch(storyDraftUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal: options.signal,
  })
  if (!response.ok) throw await apiFailure(response, 'The draft could not be generated.')

  const payload: unknown = await response.json()
  const result = asObject(payload)
  const draft = asObject(result?.draft)
  if (result?.ok !== true
    || draft?.story_id !== input.story_id
    || draft.candidate_id !== input.candidate_id
    || draft.format !== input.format
    || typeof draft.content !== 'string') {
    throw new CreatorStoryApiError(500, 'The draft could not be generated.')
  }
  return {
    ok: true,
    draft: {
      story_id: draft.story_id as string,
      candidate_id: draft.candidate_id as string,
      format: draft.format as GenerateStoryDraftResponse['draft']['format'],
      content: draft.content,
    },
  }
}

export async function dismissCreatorStory(
  supabase: SupabaseClient,
  storyId: string,
  options: { signal?: AbortSignal } = {},
): Promise<DismissCreatorStoryResponse> {
  const accessToken = await authenticatedAccessToken(supabase)
  const response = await fetch(revokeStoryPermissionUrl(storyId), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: options.signal,
  })

  if (!response.ok) {
    throw await apiFailure(response, 'The story could not be dismissed.')
  }

  const payload: unknown = await response.json()
  const result = asObject(payload)
  if (result?.ok !== true || result.story_id !== storyId) {
    throw new CreatorStoryApiError(500, 'The story could not be dismissed.')
  }

  return { ok: true, story_id: storyId }
}

export async function requestStoryApproval(
  supabase: SupabaseClient,
  storyId: string,
  options: { signal?: AbortSignal } = {},
): Promise<RequestStoryApprovalResponse> {
  const accessToken = await authenticatedAccessToken(supabase)
  const response = await fetch(requestStoryApprovalUrl(storyId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
    signal: options.signal,
  })
  if (!response.ok) throw await apiFailure(response, 'Approval could not be requested.')

  const payload: unknown = await response.json()
  const result = asObject(payload)
  if (result?.ok !== true
    || result.story_id !== storyId
    || (result.permission_status !== 'pending' && result.permission_status !== 'approved')) {
    throw new CreatorStoryApiError(500, 'Approval could not be requested.')
  }
  return {
    ok: true,
    story_id: storyId,
    permission_status: result.permission_status,
  }
}
