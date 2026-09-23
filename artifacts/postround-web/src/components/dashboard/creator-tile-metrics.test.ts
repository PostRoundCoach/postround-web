import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { creatorTileMetrics } from './creator-tile-metrics.ts'

test('creator tile displays exact known counts, without unread claims or zero-story notice', () => {
  assert.deepEqual(creatorTileMetrics({ follower_count: 0, available_story_count: 0 }), ['0 followers'])
  assert.deepEqual(creatorTileMetrics({ follower_count: 1, available_story_count: 2 }), [
    '1 follower', '2 stories available',
  ])
  assert.deepEqual(creatorTileMetrics({ follower_count: null, available_story_count: 1 }), ['1 stories available'])
  assert.deepEqual(creatorTileMetrics({ follower_count: 8, available_story_count: null }), ['8 followers'])
  assert.deepEqual(creatorTileMetrics(null), [])
})

test('landing gate precedes the existing tiles and keeps navigation on summary failure', () => {
  const page = readFileSync(new URL('../../app/(dashboard)/dashboard/page.tsx', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../../app/(dashboard)/layout.tsx', import.meta.url), 'utf8')
  const eligibility = readFileSync(new URL('../../lib/creator-stories/server-profile.ts', import.meta.url), 'utf8')
  const tile = readFileSync(new URL('./CreatorContentTile.tsx', import.meta.url), 'utf8')
  assert.match(layout, /getDashboardCreatorProfile\(\)/)
  assert.match(page, /getDashboardCreatorProfile\(\)/)
  assert.match(eligibility, /cache\(async \(\) =>/)
  assert.match(eligibility, /fetchOwnedActiveCreatorProfile\(supabase\)/)
  assert.match(eligibility, /catch \{\s*return null/)
  assert.ok(page.indexOf('if (creatorProfile) {') < page.indexOf('fetchCreatorLandingSummary(supabase)'))
  assert.ok(page.indexOf('{creatorProfile && <CreatorContentTile') < page.indexOf('{/* Dashboard Grid */}'))
  for (const existing of ['Player Profile', 'Recent Rounds', 'Player DNA', 'AI Coaching Reports', 'Subscription']) {
    assert.ok(page.includes(existing))
  }
  assert.match(tile, /href="\/creator"/)
  assert.match(tile, /View Creator Dashboard/)
  assert.match(tile, /flex flex-col.*sm:flex-row/)
  assert.doesNotMatch(tile, /story_data|script|reflection|scorecard|subscriber|revenue/)
})