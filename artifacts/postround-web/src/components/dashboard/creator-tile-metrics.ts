import type { CreatorLandingSummary } from '@/lib/creator-stories/client'

export function creatorTileMetrics(summary: CreatorLandingSummary | null): string[] {
  const metrics: string[] = []
  if (summary?.follower_count != null) {
    metrics.push(`${summary.follower_count} ${summary.follower_count === 1 ? 'follower' : 'followers'}`)
  }
  if (summary?.available_story_count != null && summary.available_story_count > 0) {
    metrics.push(`${summary.available_story_count} stories available`)
  }
  return metrics
}