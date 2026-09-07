import assert from 'node:assert/strict'
import test from 'node:test'
import { archetypeLabel, SCORECARD_COLUMNS, scorecardValue } from './storyCandidateRendering.ts'

test('scorecard rendering preserves stored values and uses a neutral dash for unavailable fields', () => {
  const row = { hole: 7, score: 5, fairway: 'miss', green: null }
  assert.deepEqual(SCORECARD_COLUMNS, [
    'Hole', 'Yards', 'Par', 'Score', 'Fairway', 'Green', 'Playable',
    'Chips', 'Putts', 'Sand', 'Penalties',
  ])
  assert.equal(scorecardValue(row, 'score'), '5')
  assert.equal(scorecardValue(row, 'fairway'), 'miss')
  assert.equal(scorecardValue(row, 'green'), '—')
  assert.equal(scorecardValue(row, 'penalties'), '—')
})

test('archetype labels are creator-readable without changing their meaning', () => {
  assert.equal(archetypeLabel('Failure / Disaster'), 'Failure / Disaster')
  assert.equal(archetypeLabel('Achievement'), 'Achievement')
})