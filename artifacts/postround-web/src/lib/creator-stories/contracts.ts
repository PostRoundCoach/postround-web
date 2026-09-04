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
  story_candidates: CreatorStoryRecord | CreatorStoryRecord[]
}

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
}

export interface GenerateCreatorStoryContentRequest {
  creator_id: string
  story_id: string
}

export interface GenerateCreatorStoryContentResponse {
  ok: true
  count: number
}

export interface GeneratedIdea {
  id: string
  story_id: string
  category: string | null
  title: string
  hook: string
  script: string
  created_at: string
}

export interface FetchGeneratedCreatorStoryIdeasResponse {
  ok: true
  ideas: GeneratedIdea[]
}

export interface RevokeCreatorStoryPermissionResponse {
  ok: true
  story_id: string
}
