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
  FetchRoundContractResponse,
  RoundWebContract,
  RoundHighlights,
  RoundScorecardEntry,
  RoundContentIdea,
  RoundCreatorContentStory,
  RoundCoachingReflection,
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

const MAX_CONCURRENT_IDEA_REQUESTS = 2
let activeIdeaRequests = 0
const ideaRequestWaiters: Array<() => void> = []

async function acquireIdeaRequestSlot(signal?: AbortSignal): Promise<() => void> {
  if (signal?.aborted) throw abortError()

  if (activeIdeaRequests >= MAX_CONCURRENT_IDEA_REQUESTS) {
    await new Promise<void>((resolve, reject) => {
      const enter = () => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }
      const onAbort = () => {
        const index = ideaRequestWaiters.indexOf(enter)
        if (index >= 0) ideaRequestWaiters.splice(index, 1)
        reject(abortError())
      }
      ideaRequestWaiters.push(enter)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  activeIdeaRequests += 1
  let released = false
  return () => {
    if (released) return
    released = true
    activeIdeaRequests -= 1
    ideaRequestWaiters.shift()?.()
  }
}

async function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw abortError()
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    const onAbort = () => {
      clearTimeout(timeout)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function contentApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL?.trim()
  if (!apiBase) throw new CreatorStoryConfigurationError()

  try {
    const url = new URL(apiBase)
    const isLocalDevelopmentOrigin = (
      process.env.NODE_ENV !== 'production'
      || process.env.NEXT_PUBLIC_POSTROUND_ALLOW_LOCAL_API === 'true'
    )
      && url.protocol === 'http:'
      && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
    if (
      (url.protocol !== 'https:' && !isLocalDevelopmentOrigin) ||
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

function creatorStoriesUrl(): string {
  return `${contentApiBase()}/api/content/stories`
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

function roundContractUrl(roundId: string): string {
  return `${contentApiBase()}/api/content/round/${encodeURIComponent(roundId)}`
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function isStoryPermissionStatus(value: unknown): value is CreatorStory['permissionStatus'] {
  return value === 'pending' || value === 'requested' || value === 'approved'
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

function isIntOrNull(v: unknown): v is number | null {
  return v === null || (typeof v === 'number' && Number.isInteger(v))
}

function isBooleanOrNull(v: unknown): v is boolean | null {
  return v === null || typeof v === 'boolean'
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === 'string'
}

function parseRoundScorecard(value: unknown): RoundScorecardEntry[] | null {
  if (!Array.isArray(value)) return null
  let previous = 0
  const result: RoundScorecardEntry[] = []
  for (const item of value) {
    const hole = asObject(item)
    if (!hole || typeof hole.hole !== 'number' || !Number.isInteger(hole.hole) || hole.hole <= previous) return null
    previous = hole.hole
    if (!isIntOrNull(hole.par) || !isIntOrNull(hole.score) || !isIntOrNull(hole.putts)
      || !isIntOrNull(hole.chips) || !isIntOrNull(hole.penalties)
      || !isFairway(hole.fairway) || !isGir(hole.gir)
      || !isBooleanOrNull(hole.bunker) || !isBooleanOrNull(hole.sand_save)
      || !isStringOrNull(hole.player_note)) return null
    result.push({
      hole: hole.hole, par: hole.par, score: hole.score, fairway: hole.fairway,
      gir: hole.gir, putts: hole.putts, chips: hole.chips, bunker: hole.bunker,
      sand_save: hole.sand_save, penalties: hole.penalties, player_note: hole.player_note,
    })
  }
  return result
}

const ROUND_HIGHLIGHT_KEYS = [
  'total_score', 'course_par', 'front_9', 'back_9', 'total_putts', 'total_penalties',
  'fairways_hit', 'total_fairways', 'fairways_left', 'fairways_right', 'fairways_long',
  'fairways_short', 'gir_hit', 'total_gir', 'gir_short', 'gir_long', 'gir_left',
  'gir_right', 'scrambling_opportunities', 'successful_scrambles', 'three_putts',
  'birdies', 'pars', 'bogeys', 'double_bogeys', 'eagles', 'albatrosses', 'hole_in_one',
] as const

function parseRoundHighlights(value: unknown): RoundHighlights | null {
  const object = asObject(value)
  if (!object || ROUND_HIGHLIGHT_KEYS.some((key) => !isIntOrNull(object[key]))) return null
  return Object.fromEntries(ROUND_HIGHLIGHT_KEYS.map((key) => [key, object[key]])) as unknown as RoundHighlights
}

function parseRoundContentIdea(value: unknown): RoundContentIdea | null {
  const object = asObject(value)
  if (!object
    || typeof object.id !== 'string' || typeof object.category !== 'string'
    || typeof object.title !== 'string' || typeof object.hook !== 'string'
    || !isStringOrNull(object.script) || !isStringOrNull(object.story_angle)
    || !isStringOrNull(object.why_interesting) || typeof object.created_at !== 'string') return null
  return {
    id: object.id, category: object.category, title: object.title, hook: object.hook,
    script: object.script, story_angle: object.story_angle, why_interesting: object.why_interesting,
    created_at: object.created_at,
  }
}

function parseRoundContract(value: unknown): RoundWebContract | null {
  const root = asObject(value)
  const round = asObject(root?.round)
  const highlights = parseRoundHighlights(root?.roundHighlights)
  const scorecard = parseRoundScorecard(root?.scorecard)
  if (!round || !highlights || !scorecard
    || typeof round.played_at !== 'string' || !isStringOrNull(round.course_name)
    || !isStringOrNull(round.tees) || !isStringOrNull(round.player_display_name)
    || !(round.input_method === null || round.input_method === 'scorecard' || round.input_method === 'round_buddy')) return null

  const creator = asObject(root?.creatorContentStory)
  const coaching = asObject(root?.coachingReflection)
  if (!creator || !coaching || typeof creator.available !== 'boolean' || typeof coaching.available !== 'boolean') return null
  let creatorContentStory: RoundCreatorContentStory
  if (!creator.available) creatorContentStory = { available: false }
  else {
    const permission = asObject(creator.permission)
    const candidate = asObject(creator.candidate)
    if (creator.permissionState !== 'granted' || !permission || !candidate
      || !isStringOrNull(permission.granted_at) || !isStringOrNull(permission.revoked_at)
      || !isStringOrNull(permission.approval_requested_at)
      || typeof candidate.id !== 'string' || typeof candidate.story_type !== 'string'
      || typeof candidate.headline !== 'string' || typeof candidate.summary !== 'string'
      || (candidate.status !== 'offered' && candidate.status !== 'shared')) return null
    const contentIdea = creator.contentIdea === null ? null : parseRoundContentIdea(creator.contentIdea)
    if (creator.contentIdea !== null && !contentIdea) return null
    creatorContentStory = {
      available: true, permissionState: 'granted',
      permission: {
        granted_at: permission.granted_at, revoked_at: permission.revoked_at,
        approval_requested_at: permission.approval_requested_at,
      },
      candidate: {
        id: candidate.id, story_type: candidate.story_type, headline: candidate.headline,
        summary: candidate.summary, status: candidate.status,
      },
      contentIdea,
    }
  }
  let coachingReflection: RoundCoachingReflection
  if (!coaching.available) coachingReflection = { available: false }
  else {
    const content = asObject(coaching.content)
    if (!content || typeof content.id !== 'string' || typeof content.title !== 'string'
      || typeof content.hook !== 'string' || !isStringOrNull(content.reflection)
      || !isStringOrNull(content.script) || typeof content.created_at !== 'string') return null
    coachingReflection = {
      available: true,
      content: {
        id: content.id, title: content.title, hook: content.hook,
        reflection: content.reflection, script: content.script, created_at: content.created_at,
      },
    }
  }
  return {
    round: {
      played_at: round.played_at, course_name: round.course_name, tees: round.tees,
      player_display_name: round.player_display_name, input_method: round.input_method,
    },
    roundHighlights: highlights, scorecard, creatorContentStory, coachingReflection,
  }
}

function isFairway(v: unknown): v is 'hit' | 'left' | 'right' | 'short' | 'long' | 'none' | null {
  return v === null || v === 'hit' || v === 'left' || v === 'right' || v === 'short' || v === 'long' || v === 'none'
}

function isGir(v: unknown): v is 'hit' | 'short' | 'long' | 'left' | 'right' | 'none' | null {
  return v === null || v === 'hit' || v === 'short' || v === 'long' || v === 'left' || v === 'right' || v === 'none'
}

function toContentIdea(value: unknown): CreatorContentIdea | null {
  const idea = asObject(value)
  if (!idea) return null
  const strings = ['id', 'story_id', 'category', 'title', 'hook', 'script', 'created_at'] as const
  if (strings.some((field) => typeof idea[field] !== 'string')) return null

  let round: CreatorContentIdea['round'] = null

  if ('round' in idea && idea.round !== null) {
    const r = asObject(idea.round)
    if (!r) return null

    if (!('player_display_name' in r) || !isStringOrNull(r.player_display_name)) return null
    if (typeof r.played_at !== 'string') return null
    if (!('course_name' in r) || !isStringOrNull(r.course_name)) return null
    if (!('tees' in r) || !isStringOrNull(r.tees)) return null

    const intKeys = [
      'total_score', 'course_par', 'score_to_par', 'front_9', 'back_9', 'total_putts', 'total_penalties',
      'fairways_hit', 'total_fairways', 'fairways_left', 'fairways_right', 'fairways_long', 'fairways_short',
      'fairways_missed', 'fairways_playable', 'gir_hit', 'total_gir', 'gir_short', 'gir_long', 'gir_left', 'gir_right',
      'gir_missed', 'gir_playable', 'scrambling_opportunities', 'successful_scrambles', 'three_putts',
      'birdies', 'pars', 'bogeys', 'double_bogeys', 'triple_bogeys', 'eagles', 'albatrosses', 'hole_in_one',
      'sand_save_opportunities', 'successful_sand_saves'
    ] as const

    for (const key of intKeys) {
      if (!(key in r) || !isIntOrNull(r[key])) return null
    }

    if (!Array.isArray(r.scorecard)) return null

    const parsedScorecard: NonNullable<CreatorContentIdea['round']>['scorecard'] = []
    let prevHole = -1

    for (const h of r.scorecard) {
      const hole = asObject(h)
      if (!hole) return null

      if (typeof hole.hole !== 'number' || !Number.isInteger(hole.hole)) return null
      if (hole.hole <= prevHole) return null
      prevHole = hole.hole

      if (!('par' in hole) || !isIntOrNull(hole.par)) return null
      if (!('score' in hole) || !isIntOrNull(hole.score)) return null
      if (!('putts' in hole) || !isIntOrNull(hole.putts)) return null
      if (!('chips' in hole) || !isIntOrNull(hole.chips)) return null
      if (!('penalties' in hole) || !isIntOrNull(hole.penalties)) return null

      if (!('fairway' in hole) || !isFairway(hole.fairway)) return null
      if (!('gir' in hole) || !isGir(hole.gir)) return null

      if (!('bunker' in hole) || !isBooleanOrNull(hole.bunker)) return null
      if (!('sand_save' in hole) || !isBooleanOrNull(hole.sand_save)) return null
      if (!('player_note' in hole) || !isStringOrNull(hole.player_note)) return null

      parsedScorecard.push({
        hole: hole.hole,
        par: hole.par,
        score: hole.score,
        fairway: hole.fairway,
        gir: hole.gir,
        putts: hole.putts,
        chips: hole.chips,
        bunker: hole.bunker,
        sand_save: hole.sand_save,
        penalties: hole.penalties,
        player_note: hole.player_note,
      })
    }

    round = {
      player_display_name: r.player_display_name as string | null,
      played_at: r.played_at as string,
      course_name: r.course_name as string | null,
      tees: r.tees as string | null,
      total_score: r.total_score as number | null,
      course_par: r.course_par as number | null,
      score_to_par: r.score_to_par as number | null,
      front_9: r.front_9 as number | null,
      back_9: r.back_9 as number | null,
      total_putts: r.total_putts as number | null,
      total_penalties: r.total_penalties as number | null,
      fairways_hit: r.fairways_hit as number | null,
      total_fairways: r.total_fairways as number | null,
      fairways_left: r.fairways_left as number | null,
      fairways_right: r.fairways_right as number | null,
      fairways_long: r.fairways_long as number | null,
      fairways_short: r.fairways_short as number | null,
      fairways_missed: r.fairways_missed as number | null,
      fairways_playable: r.fairways_playable as number | null,
      gir_hit: r.gir_hit as number | null,
      total_gir: r.total_gir as number | null,
      gir_short: r.gir_short as number | null,
      gir_long: r.gir_long as number | null,
      gir_left: r.gir_left as number | null,
      gir_right: r.gir_right as number | null,
      gir_missed: r.gir_missed as number | null,
      gir_playable: r.gir_playable as number | null,
      scrambling_opportunities: r.scrambling_opportunities as number | null,
      successful_scrambles: r.successful_scrambles as number | null,
      three_putts: r.three_putts as number | null,
      birdies: r.birdies as number | null,
      pars: r.pars as number | null,
      bogeys: r.bogeys as number | null,
      double_bogeys: r.double_bogeys as number | null,
      triple_bogeys: r.triple_bogeys as number | null,
      eagles: r.eagles as number | null,
      albatrosses: r.albatrosses as number | null,
      hole_in_one: r.hole_in_one as number | null,
      sand_save_opportunities: r.sand_save_opportunities as number | null,
      successful_sand_saves: r.successful_sand_saves as number | null,
      scorecard: parsedScorecard
    }
  }

  return {
    id: idea.id as string,
    story_id: idea.story_id as string,
    category: idea.category as string,
    title: idea.title as string,
    hook: idea.hook as string,
    script: idea.script as string,
    created_at: idea.created_at as string,
    round,
  }
}

function abortError(): Error {
  return new DOMException('The request was aborted.', 'AbortError')
}

async function authenticatedAccessToken(
  supabase: SupabaseClient,
  options: { signal?: AbortSignal } = {},
): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  if (sessionError) {
    throw new CreatorStoryApiError(401)
  }
  if (accessToken) return accessToken
  if (options.signal?.aborted) throw abortError()

  // Browser auth hydration can finish after the first client render. Waiting for
  // INITIAL_SESSION avoids turning that transient state into a permanent card error.
  return await new Promise<string>((resolve, reject) => {
    let settled = false
    let subscription: { unsubscribe(): void } | undefined
    const finish = (token?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', onAbort)
      subscription?.unsubscribe()
      token ? resolve(token) : reject(new CreatorStoryApiError(401))
    }
    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      subscription?.unsubscribe()
      reject(abortError())
    }
    const timeout = setTimeout(() => finish(), 5_000)
    const authListener = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const token = nextSession?.access_token
      if (token) finish(token)
    })
    subscription = authListener.data.subscription
    if (settled) subscription.unsubscribe()
    options.signal?.addEventListener('abort', onAbort, { once: true })
    if (options.signal?.aborted) onAbort()
  })
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
    roundId: record.round_id,
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

export async function fetchRoundContract(
  supabase: SupabaseClient,
  roundId: string,
  options: { signal?: AbortSignal } = {},
): Promise<FetchRoundContractResponse> {
  const accessToken = await authenticatedAccessToken(supabase, options)
  const response = await fetch(roundContractUrl(roundId), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: options.signal,
  })
  if (!response.ok) throw await apiFailure(response, 'The round could not be loaded.')
  const payload: unknown = await response.json()
  const result = asObject(payload)
  const contract = parseRoundContract(result?.contract)
  if (result?.ok !== true || !contract) {
    throw new CreatorStoryApiError(500, 'The round could not be loaded.')
  }
  return { ok: true, contract }
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
  _creatorId: string,
): Promise<CreatorStory[]> {
  const accessToken = await authenticatedAccessToken(supabase)
  const response = await fetch(creatorStoriesUrl(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw await apiFailure(response, 'The creator workspace could not be loaded.')
  const payload: unknown = await response.json()
  const result = asObject(payload)
  if (result?.ok !== true || !Array.isArray(result.stories)) {
    throw new CreatorStoryApiError(500, 'The creator workspace could not be loaded.')
  }
  return result.stories.map((value) => {
    const record = asObject(value)
    if (!record || !isStoryPermissionStatus(record.permission_status)) {
      throw new CreatorStoryApiError(500, 'The creator workspace could not be loaded.')
    }
    return toCreatorStory(record as unknown as CreatorStoryRecord, record.permission_status)
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
    || typeof result.count !== 'number') {
    throw new CreatorStoryApiError(500)
  }
  const refreshed = await fetchStoryCandidates(supabase, input.story_id, options)
  return {
    ok: true,
    count: result.count,
    ideas: refreshed.ideas,
    permission_status: refreshed.permission_status,
  }
}

export async function fetchStoryCandidates(
  supabase: SupabaseClient,
  storyId: string,
  options: { signal?: AbortSignal } = {},
): Promise<FetchStoryCandidatesResponse> {
  const release = await acquireIdeaRequestSlot(options.signal)
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const accessToken = await authenticatedAccessToken(supabase, options)
      const response = await fetch(generatedIdeasUrl(storyId), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: options.signal,
      })

      if (!response.ok) {
        const error = await apiFailure(response, 'Generated content could not be loaded.')
        if (error.status === 429 && attempt === 0) {
          await abortableDelay(300, options.signal)
          continue
        }
        throw error
      }

      const payload: unknown = await response.json()
      const result = asObject(payload)
      if (result?.ok !== true
        || result.story_id !== storyId
        || !Array.isArray(result.ideas)
        || !isStoryPermissionStatus(result.permission_status)) {
        throw new CreatorStoryApiError(500, 'Generated content could not be loaded.')
      }

      const ideas = result.ideas.map(toContentIdea)
      if (ideas.some((idea) => idea === null || idea.story_id !== storyId)) {
        throw new CreatorStoryApiError(500, 'Generated content could not be loaded.')
      }

      return {
        ok: true,
        story_id: storyId,
        ideas: ideas as CreatorContentIdea[],
        permission_status: result.permission_status,
      }
    }
    throw new CreatorStoryApiError(500, 'Generated content could not be loaded.')
  } finally {
    release()
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
    || !isStoryPermissionStatus(result.permission_status)) {
    throw new CreatorStoryApiError(500, 'Approval could not be requested.')
  }
  return {
    ok: true,
    story_id: storyId,
    permission_status: result.permission_status,
  }
}
