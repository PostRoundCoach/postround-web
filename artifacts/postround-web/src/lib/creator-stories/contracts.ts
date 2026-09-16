export interface CreatorSocialAccount {
  id: string
  platform: string
  handle: string
  profile_url: string | null
}

export interface CreatorProfile {
  id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  status: 'active'
  created_at: string
  updated_at: string
  creator_social_accounts: CreatorSocialAccount[]
}

export type CreatorStoryStatus =
  | 'candidate'
  | 'offered'
  | 'shared'
  | 'kept_private'
  | 'expired'

export interface CreatorStoryRecord {
  id: string
  story_type: string
  headline: string
  summary: string
  story_data: unknown
  round_id: string
  status: CreatorStoryStatus
}

export interface PermissionedCreatorStoryRecord {
  story_id: string
  approval_requested_at: string | null
  granted_at: string | null
  story_candidates: CreatorStoryRecord | CreatorStoryRecord[]
}

export type StoryPermissionStatus = 'pending' | 'requested' | 'approved'

export interface CreatorStory {
  id: string
  roundId: string
  storyType: string
  headline: string
  summary: string
  status: CreatorStoryStatus
  roundDate: string | null
  course: string | null
  golferDisplayName: string | null
  supportingFacts: string[]
  permissionStatus: StoryPermissionStatus
}

export interface GenerateStoryCandidatesRequest {
  story_id: string
  creator_id: string
}

export interface ScorecardHole {
  hole: number
  yards?: number | null
  par?: number | null
  score?: number | null
  fairway?: string | null
  green?: string | null
  playable?: boolean | null
  chips?: number | null
  putts?: number | null
  sand?: boolean | null
  penalties?: number | null
}

export interface StoryTranscriptHighlight {
  excerpt: string
}

export interface StoryCandidateEvidence {
  label: string
  detail: string
}

export interface StoryCandidate {
  id: string
  story_id: string
  archetype: 'Achievement' | 'Drama' | 'Surprise' | 'Failure / Disaster' | 'Insight' | 'Progress'
  title: string
  hook: string
  summary: string
  why_interesting: string
  evidence: StoryCandidateEvidence[]
  relevant_holes: number[]
  confidence: number
  suggested_format: string | null
  transcript_highlights: StoryTranscriptHighlight[]
  scorecard: ScorecardHole[]
}

export interface GenerateStoryCandidatesResponse {
  ok: true
  count: number
  ideas: CreatorContentIdea[]
  permission_status: StoryPermissionStatus
}

export type StoryDraftFormat = 'caption' | 'short_video_script' | 'carousel_outline'

export interface GenerateStoryDraftRequest {
  story_id: string
  candidate_id: string
  format: StoryDraftFormat
}

export interface StoryDraft {
  story_id: string
  candidate_id: string
  format: StoryDraftFormat
  content: string
}

export interface GenerateStoryDraftResponse {
  ok: true
  draft: StoryDraft
}

export interface FetchStoryCandidatesResponse {
  ok: true
  story_id: string
  ideas: CreatorContentIdea[]
  permission_status: StoryPermissionStatus
}

export type RoundInputMethod = 'scorecard' | 'round_buddy'

export interface RoundSummary {
  played_at: string
  course_name: string | null
  tees: string | null
  player_display_name: string | null
  input_method: RoundInputMethod | null
}

export interface RoundHighlights {
  total_score: number | null
  course_par: number | null
  front_9: number | null
  back_9: number | null
  total_putts: number | null
  total_penalties: number | null
  fairways_hit: number | null
  total_fairways: number | null
  fairways_left: number | null
  fairways_right: number | null
  fairways_long: number | null
  fairways_short: number | null
  gir_hit: number | null
  total_gir: number | null
  gir_short: number | null
  gir_long: number | null
  gir_left: number | null
  gir_right: number | null
  scrambling_opportunities: number | null
  successful_scrambles: number | null
  three_putts: number | null
  birdies: number | null
  pars: number | null
  bogeys: number | null
  double_bogeys: number | null
  eagles: number | null
  albatrosses: number | null
  hole_in_one: number | null
}

export type ScorecardFairway = 'hit' | 'left' | 'right' | 'short' | 'long' | 'none'
export type ScorecardGir = 'hit' | 'short' | 'long' | 'left' | 'right' | 'none'

export interface RoundScorecardEntry {
  hole: number
  par: number | null
  score: number | null
  fairway: ScorecardFairway | null
  gir: ScorecardGir | null
  putts: number | null
  chips: number | null
  bunker: boolean | null
  sand_save: boolean | null
  penalties: number | null
  player_note: string | null
}

export interface StoryPermissionTimestamps {
  granted_at: string | null
  revoked_at: string | null
  approval_requested_at: string | null
}

export interface RoundStoryCandidate {
  id: string
  story_type: string
  headline: string
  summary: string
  status: 'offered' | 'shared'
}

export interface RoundContentIdea {
  id: string
  category: string
  title: string
  hook: string
  script: string | null
  story_angle: string | null
  why_interesting: string | null
  created_at: string
}

export interface CreatorContentStoryAvailable {
  available: true
  permissionState: 'granted'
  permission: StoryPermissionTimestamps
  candidate: RoundStoryCandidate
  contentIdea: RoundContentIdea | null
}

export interface CreatorContentStoryUnavailable {
  available: false
}

export type RoundCreatorContentStory = CreatorContentStoryAvailable | CreatorContentStoryUnavailable

export interface CoachingReflectionContent {
  id: string
  title: string
  hook: string
  reflection: string | null
  script: string | null
  created_at: string
}

export interface CoachingReflectionAvailable {
  available: true
  content: CoachingReflectionContent
}

export interface CoachingReflectionUnavailable {
  available: false
}

export type RoundCoachingReflection = CoachingReflectionAvailable | CoachingReflectionUnavailable

export interface RoundWebContract {
  round: RoundSummary
  roundHighlights: RoundHighlights
  scorecard: RoundScorecardEntry[]
  creatorContentStory: RoundCreatorContentStory
  coachingReflection: RoundCoachingReflection
}

export interface FetchRoundContractResponse {
  ok: true
  contract: RoundWebContract
}

export interface CreatorContentIdea {
  id: string
  story_id: string
  category: string
  title: string
  hook: string
  script: string
  created_at: string
  round: {
    player_display_name: string | null
    played_at: string
    course_name: string | null
    tees: string | null
    total_score: number | null
    course_par: number | null
    score_to_par: number | null
    front_9: number | null
    back_9: number | null
    total_putts: number | null
    total_penalties: number | null
    fairways_hit: number | null
    total_fairways: number | null
    fairways_left: number | null
    fairways_right: number | null
    fairways_long: number | null
    fairways_short: number | null
    fairways_missed: number | null
    fairways_playable: number | null
    gir_hit: number | null
    total_gir: number | null
    gir_short: number | null
    gir_long: number | null
    gir_left: number | null
    gir_right: number | null
    gir_missed: number | null
    gir_playable: number | null
    scrambling_opportunities: number | null
    successful_scrambles: number | null
    three_putts: number | null
    birdies: number | null
    pars: number | null
    bogeys: number | null
    double_bogeys: number | null
    triple_bogeys: number | null
    eagles: number | null
    albatrosses: number | null
    hole_in_one: number | null
    sand_save_opportunities: number | null
    successful_sand_saves: number | null
    scorecard: {
      hole: number
      par: number | null
      score: number | null
      fairway: 'hit' | 'left' | 'right' | 'short' | 'long' | 'none' | null
      gir: 'hit' | 'short' | 'long' | 'left' | 'right' | 'none' | null
      putts: number | null
      chips: number | null
      bunker: boolean | null
      sand_save: boolean | null
      penalties: number | null
      player_note: string | null
    }[]
  } | null
}

export interface DismissCreatorStoryResponse {
  ok: true
  story_id: string
}

export interface RequestStoryApprovalResponse {
  ok: true
  story_id: string
  permission_status: StoryPermissionStatus
}
