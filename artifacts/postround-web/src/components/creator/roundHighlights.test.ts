import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoundHighlights, RoundScorecardEntry } from '../../lib/creator-stories/contracts.ts'
import { relativeToPar, scoringCategoryLabels, selectRoundMoments } from './roundHighlights.ts'

const highlights = {
  total_score: 99, course_par: 70, score_to_par: 7, front_9: null, back_9: null,
  total_putts: 16, total_penalties: 1, fairways_hit: 3, total_fairways: 6,
  fairways_left: null, fairways_right: null, fairways_long: null, fairways_short: null,
  gir_hit: 3, total_gir: 9, gir_short: null, gir_long: null, gir_left: null, gir_right: null,
  scrambling_opportunities: null, successful_scrambles: null, three_putts: 0,
  birdies: 2, pars: 3, bogeys: 2, double_bogeys: 1, triple_bogeys: 1,
  eagles: 1, albatrosses: 1, hole_in_one: 1,
} satisfies RoundHighlights

test('orders authoritative non-zero scoring categories from exceptional to ordinary', () => {
  assert.deepEqual(scoringCategoryLabels(highlights), [
    '1 Hole-in-one', '1 Albatross', '1 Eagle', '2 Birdies',
    '3 Pars', '2 Bogeys', '1 Double Bogey', '1 Triple Bogey',
  ])
  assert.deepEqual(scoringCategoryLabels({
    ...highlights, hole_in_one: 0, albatrosses: null, eagles: 0, pars: 0,
  }), ['2 Birdies', '2 Bogeys', '1 Double Bogey', '1 Triple Bogey'])
  assert.equal(relativeToPar(highlights.score_to_par), '+7')
  assert.notEqual(highlights.total_score - highlights.course_par!, highlights.score_to_par)
})

test('selects only evidence-backed standout and notable holes while preserving notes', () => {
  const holes: RoundScorecardEntry[] = [
    { hole: 1, par: 4, score: 3, fairway: 'hit', gir: 'hit', putts: 1, chips: 0, bunker: false, sand_save: null, penalties: 0, player_note: 'Made a 20-foot putt' },
    { hole: 2, par: 4, score: 7, fairway: 'left', gir: 'short', putts: 2, chips: 2, bunker: false, sand_save: null, penalties: 1, player_note: null },
    { hole: 3, par: 4, score: 4, fairway: 'hit', gir: 'hit', putts: 2, chips: 0, bunker: false, sand_save: null, penalties: 0, player_note: null },
  ]
  const moments = selectRoundMoments(holes)
  assert.deepEqual(moments.standout, [{ hole: 1, label: 'Birdie', description: 'Made a 20-foot putt' }])
  assert.deepEqual(moments.other, [{ hole: 2, label: null, description: '1 penalty stroke · 2 chips · triple bogey' }])
  assert.equal(moments.other.some((moment) => moment.hole === 3), false)
})