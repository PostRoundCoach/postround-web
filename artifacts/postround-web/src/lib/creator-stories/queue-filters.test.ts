import assert from 'node:assert/strict'
import test from 'node:test'
import type { CreatorStory } from './contracts'
import { filterStoryQueue } from './queue-filters.ts'

const now = new Date(2026, 8, 30, 12)
const story = (id: string, created: Date): CreatorStory => ({
  id, roundId: 'round', headline: id, summary: 'Summary', storyType: 'open',
  status: 'shared', createdAt: created.toISOString(),
})
const stories = [
  story('today', new Date(2026, 8, 30, 8)),
  story('six-days', new Date(2026, 8, 24)),
  story('old', new Date(2020, 0, 1)),
  story('future', new Date(2026, 9, 1)),
]
test('all-time default keeps every returned candidate in server order without significance', () => {
  assert.equal(filterStoryQueue(stories, 'all', now), stories)
})
test('optional local calendar date filters preserve order and exclude future dates', () => {
  assert.deepEqual(filterStoryQueue(stories, '7', now).map((s) => s.id), ['today', 'six-days'])
  assert.deepEqual(filterStoryQueue(stories, 'today', now).map((s) => s.id), ['today'])
  assert.deepEqual(filterStoryQueue([stories[2]], '30', now), [])
})

test('relevance is opt-in; missing scores are safe and cannot satisfy an enabled threshold', () => {
  const scored = [{ ...stories[2], significanceScore: 78 }, { ...stories[0], significanceScore: 60 }, stories[1]]
  assert.equal(filterStoryQueue(scored, 'all', now), scored)
  assert.deepEqual(filterStoryQueue(scored, 'all', now, 70), [scored[0]])
  assert.deepEqual(filterStoryQueue(scored, '7', now, 90), [])
})
