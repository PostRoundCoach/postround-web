import type { RoundScorecardEntry } from '@/lib/creator-stories/contracts'
import { selectRoundMoments } from './roundHighlights.ts'

export function selectPlayerNotes(scorecard: RoundScorecardEntry[]) {
  const moments = selectRoundMoments(scorecard)
  const notable = new Set([...moments.standout, ...moments.other].map(({ hole }) => hole))
  const seen = new Set<number>()
  return scorecard.filter((entry) => {
    if (!notable.has(entry.hole) || seen.has(entry.hole)
      || !entry.player_note?.trim() || !entry.voice_transcript?.trim()) return false
    seen.add(entry.hole)
    return true
  }).sort((a, b) => a.hole - b.hole)
}