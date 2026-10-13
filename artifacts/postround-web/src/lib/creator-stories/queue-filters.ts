import type { CreatorStory } from './contracts'

export type StoryDateRange = 'all' | 'today' | '7' | '30'

export function filterStoryQueue(
  stories: CreatorStory[],
  dateRange: StoryDateRange,
  now: Date = new Date(),
  minimumSignificance: number | null = null,
): CreatorStory[] {
  const relevant = minimumSignificance === null ? stories
    : stories.filter((story) => typeof story.significanceScore === 'number' && story.significanceScore >= minimumSignificance)
  if (dateRange === 'all') return relevant
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - (dateRange === 'today' ? 0 : Number(dateRange) - 1))
  const startTime = start.getTime()
  const nowTime = now.getTime()
  return relevant.filter((story) => {
    const created = new Date(story.createdAt).getTime()
    return Number.isFinite(created)
      && created >= startTime
      && created <= nowTime
  })
}