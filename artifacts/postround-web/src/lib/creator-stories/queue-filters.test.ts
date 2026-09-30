import assert from 'node:assert/strict'
import test from 'node:test'
import type { CreatorStory } from './contracts'
import { filterStoryQueue } from './queue-filters.ts'

const now = new Date(2026, 8, 30, 12, 0)
const story = (id: string, significanceScore: number, created: Date): CreatorStory => ({
  id, significanceScore, createdAt: created.toISOString(),
} as CreatorStory)
const local = (day: number, hour = 0, minute = 0) => new Date(2026, 8, day, hour, minute)
const stories = [
  story('today-73', 73, local(30, 8)),
  story('day-6', 70, local(24)),
  story('day-7', 90, local(23, 23, 59)),
  story('day-29', 80, local(1)),
  story('old', 90, new Date(2026, 7, 31, 23, 59)),
  story('low', 60, local(30)),
  story('future-today', 90, local(30, 13)),
  story('future-day', 90, new Date(2026, 9, 1)),
]

test('default seven local calendar days include today and six prior days, not future timestamps', () => {
  assert.deepEqual(filterStoryQueue(stories, 70, '7', now).map((item) => item.id), ['today-73', 'day-6'])
})

test('slider thresholds are inclusive and combine with date ranges', () => {
  assert.deepEqual(filterStoryQueue(stories, 80, '7', now).map((item) => item.id), [])
  assert.deepEqual(filterStoryQueue(stories, 60, 'today', now).map((item) => item.id), ['today-73', 'low'])
  assert.deepEqual(filterStoryQueue(stories, 70, '30', now).map((item) => item.id), [
    'today-73', 'day-6', 'day-7', 'day-29',
  ])
  assert.deepEqual(filterStoryQueue(stories, 90, '30', now).map((item) => item.id), ['day-7'])
  assert.deepEqual(filterStoryQueue(stories, 70, 'today', now).map((item) => item.id), ['today-73'])
})

test('date boundaries follow the viewer local day, not a rolling 24-hour interval', () => {
  const early = new Date(2026, 8, 30, 0, 1)
  assert.deepEqual(filterStoryQueue([
    story('yesterday', 70, local(29, 23, 59)),
    story('today', 70, local(30)),
  ], 70, 'today', early).map((item) => item.id), ['today'])
})