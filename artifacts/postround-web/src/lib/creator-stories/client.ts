import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreatorProfile,
  CreatorStory,
  CreatorStoryRecord,
  PermissionedCreatorStoryRecord,
  GenerateCreatorStoryContentRequest,
  GenerateCreatorStoryContentResponse,
  FetchGeneratedCreatorStoryIdeasResponse,
  GeneratedIdea,
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

  constructor(status: number, message = 'Content generation could not be completed.') {
    super(message)
    this.name = 'CreatorStoryApiError'
    this.status = status
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

  if (!apiBase) {
    throw new CreatorStoryConfigurationError()
  }

  return apiBase.replace(/\/+$/, '')
}

function contentGenerationUrl(): string {
  return `${contentApiBase()}/api/content/generate`
}

function generatedIdeasUrl(storyId: string): string {
  const query = new URLSearchParams({ story_id: storyId })
  return `${contentApiBase()}/api/content/ideas?${query.toString()}`
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

function toGeneratedIdea(value: unknown): GeneratedIdea | null {
  const idea = asObject(value)
  if (!idea) return null

  const requiredFields = [
    'id',
    'story_id',
    'title',
    'hook',
    'script',
    'created_at',
  ] as const

  if (requiredFields.some((field) => typeof idea[field] !== 'string')) {
    return null
  }

  if (
    idea.category !== undefined
    && idea.category !== null
    && typeof idea.category !== 'string'
  ) {
    return null
  }

  return {
    id: idea.id as string,
    story_id: idea.story_id as string,
    category: typeof idea.category === 'string' ? idea.category : null,
    title: idea.title as string,
    hook: idea.hook as string,
    script: idea.script as string,
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

export function toCreatorStory(record: CreatorStoryRecord): CreatorStory {
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

    return related.filter(Boolean).map(toCreatorStory)
  })
}

export async function generateCreatorStoryContent(
  supabase: SupabaseClient,
  input: GenerateCreatorStoryContentRequest,
  options: { signal?: AbortSignal } = {},
): Promise<GenerateCreatorStoryContentResponse> {
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
    throw new CreatorStoryApiError(response.status)
  }

  const payload: unknown = await response.json()
  const result = asObject(payload)

  if (result?.ok !== true || typeof result.count !== 'number') {
    throw new CreatorStoryApiError(500)
  }

  return { ok: true, count: result.count }
}

export async function fetchGeneratedCreatorStoryIdeas(
  supabase: SupabaseClient,
  storyId: string,
  options: { signal?: AbortSignal } = {},
): Promise<FetchGeneratedCreatorStoryIdeasResponse> {
  const accessToken = await authenticatedAccessToken(supabase)
  const response = await fetch(generatedIdeasUrl(storyId), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: options.signal,
  })

  if (!response.ok) {
    throw new CreatorStoryApiError(
      response.status,
      'Generated content could not be loaded.',
    )
  }

  const payload: unknown = await response.json()
  const result = asObject(payload)
  if (result?.ok !== true || !Array.isArray(result.ideas)) {
    throw new CreatorStoryApiError(500, 'Generated content could not be loaded.')
  }

  const ideas = result.ideas.map(toGeneratedIdea)
  if (ideas.some((idea) => idea === null)) {
    throw new CreatorStoryApiError(500, 'Generated content could not be loaded.')
  }

  return {
    ok: true,
    ideas: ideas as GeneratedIdea[],
  }
}
