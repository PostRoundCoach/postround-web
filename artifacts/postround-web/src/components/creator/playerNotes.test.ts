import assert from 'node:assert/strict'
import test from 'node:test'
import type { RoundScorecardEntry } from '../../lib/creator-stories/contracts.ts'
import { selectPlayerNotes } from './playerNotes.ts'

const makeHole = (hole: number, par: number, score: number, player_note: string | null, voice_transcript: string | null): RoundScorecardEntry => ({
  hole, par, score, player_note, voice_transcript,
  fairway: null, gir: null, putts: null, chips: null, bunker: null,
  sand_save: null, penalties: null,
})

test('uses only existing standout and player-context moments with both note and transcript', () => {
  const holes = [
    makeHole(1, 4, 2, 'hold out for an eagle', 'First hole, hit the fairway with my 3-wood and hold out for an eagle, no putts.'),
    makeHole(2, 4, 4, null, 'Ordinary transcript'),
    makeHole(3, 4, 4, null, null),
    makeHole(4, 4, 3, 'Long drive, hit green, one putt for birdie.', 'Long, massive drive down the middle of the fairway, hit the green, one putt for Birdie.'),
    makeHole(5, 4, 4, null, null),
    makeHole(6, 4, 4, null, 'Ordinary transcript'),
    makeHole(7, 4, 3, 'nice approach shot, beautiful long putt', 'Just missed the fairway left.\n\nOne pot.'),
    makeHole(8, 4, 4, null, 'Ordinary transcript'),
    makeHole(9, 4, 4, null, 'Ordinary transcript'),
  ]
  assert.deepEqual(selectPlayerNotes([...holes, holes[6]]).map(({ hole }) => hole), [1, 4, 7])
  assert.equal(selectPlayerNotes(holes)[2]?.voice_transcript, 'Just missed the fairway left.\n\nOne pot.')
  assert.deepEqual(selectPlayerNotes([makeHole(10, 4, 4, '  ', 'A transcript'),
    makeHole(11, 4, 3, 'Note', '  ')]), [])
})