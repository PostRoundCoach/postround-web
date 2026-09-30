import type { CreatorStory } from './contracts'

export type StoryDateRange = 'today' | '7' | '30'

export function filterStoryQueue(
  stories: CreatorStory[],
  minimumSignificance: number,
  dateRange: StoryDateRange,
  now: Date = new Date(),
): CreatorStory[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - (dateRange === 'today' ? 0 : Number(dateRange) - 1))
  const startTime = start.getTime()
  const nowTime = now.getTime()
  return stories.filter((story) => {
    const created = new Date(story.createdAt).getTime()
    return story.significanceScore >= minimumSignificance
      && Number.isFinite(created)
      && created >= startTime
      && created <= nowTime
  })
}