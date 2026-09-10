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
  candidates: StoryCandidate[]
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
  round_id: string
  ideas: CreatorContentIdea[]
  permission_status: StoryPermissionStatus
}

export interface CreatorContentIdea {
  id: string
  story_id: string
  round_id: string
  category: string
  title: string
  hook: string
  script: string
  stats_used: Record<string, unknown>
  status: string
  created_at: string
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
