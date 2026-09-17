export type PermissionState = "granted";
export type FairwayResult = "hit" | "left" | "right" | "short" | "long" | "none" | null;
export type GirResult = "hit" | "short" | "long" | "left" | "right" | "none" | null;

export interface RoundSummary {
  played_at: string;
  course_name: string | null;
  tees: string | null;
  player_display_name: string | null;
}

export interface RoundHighlights {
  total_score: number | null;
  course_par: number | null;
  front_9: number | null;
  back_9: number | null;
  total_putts: number | null;
  total_penalties: number | null;
  fairways_hit: number | null;
  total_fairways: number | null;
  fairways_left: number | null;
  fairways_right: number | null;
  fairways_long: number | null;
  fairways_short: number | null;
  gir_hit: number | null;
  total_gir: number | null;
  gir_short: number | null;
  gir_long: number | null;
  gir_left: number | null;
  gir_right: number | null;
  scrambling_opportunities: number | null;
  successful_scrambles: number | null;
  three_putts: number | null;
  birdies: number | null;
  pars: number | null;
  bogeys: number | null;
  double_bogeys: number | null;
  eagles: number | null;
  albatrosses: number | null;
  hole_in_one: number | null;
}

export interface ScorecardEntry {
  hole: number;
  par: number | null;
  score: number | null;
  fairway: FairwayResult;
  gir: GirResult;
  putts: number | null;
  chips: number | null;
  bunker: boolean | null;
  sand_save: boolean | null;
  penalties: number | null;
  player_note: string | null;
}

export interface StoryPermissionTimestamps {
  granted_at: string | null;
  revoked_at: string | null;
  approval_requested_at: string | null;
}

export interface StoryCandidateSummary {
  id: string;
  story_type: string;
  headline: string;
  summary: string;
  status: "offered" | "shared";
}

export interface CreatorContentIdeaSummary {
  id: string;
  category: string;
  title: string;
  hook: string;
  script: string | null;
  story_angle: string | null;
  why_interesting: string | null;
  created_at: string;
}

export type CreatorContentStory =
  | { available: false }
  | {
      available: true;
      permissionState: PermissionState;
      permission: StoryPermissionTimestamps;
      candidate: StoryCandidateSummary;
      contentIdea: CreatorContentIdeaSummary | null;
    };

export interface CoachingReflectionContent {
  id: string;
  title: string;
  hook: string;
  reflection: string | null;
  script: string | null;
  created_at: string;
}

export type CoachingReflection =
  | { available: false }
  | { available: true; content: CoachingReflectionContent };

export interface RoundWebContract {
  round: RoundSummary;
  roundHighlights: RoundHighlights;
  scorecard: ScorecardEntry[];
  creatorContentStory: CreatorContentStory;
  coachingReflection: CoachingReflection;
}