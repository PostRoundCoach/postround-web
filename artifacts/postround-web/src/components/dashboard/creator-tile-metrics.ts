import type { CreatorLandingSummary } from '@/lib/creator-stories/client'

export function creatorTileMetrics(summary: CreatorLandingSummary | null): string[] {
  const metrics: string[] = []
  if (summary) {
    metrics.push(`${summary.summary.storyCount} ${summary.summary.storyCount === 1 ? 'story' : 'stories'} available`)
  }
  return metrics
}