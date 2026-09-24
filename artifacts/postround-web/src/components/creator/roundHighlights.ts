import type { RoundHighlights, RoundScorecardEntry } from '@/lib/creator-stories/contracts'

export interface HighlightMoment {
  hole: number
  label: string | null
  description: string | null
}

const CATEGORIES: Array<[keyof RoundHighlights, string, string]> = [
  ['hole_in_one', 'Hole-in-one', 'Hole-in-ones'],
  ['albatrosses', 'Albatross', 'Albatrosses'],
  ['eagles', 'Eagle', 'Eagles'],
  ['birdies', 'Birdie', 'Birdies'],
  ['pars', 'Par', 'Pars'],
  ['bogeys', 'Bogey', 'Bogeys'],
  ['double_bogeys', 'Double Bogey', 'Double Bogeys'],
  ['triple_bogeys', 'Triple Bogey', 'Triple Bogeys'],
]

export function scoringCategoryLabels(highlights: RoundHighlights): string[] {
  return CATEGORIES.flatMap(([key, singular, plural]) => {
    const count = highlights[key]
    return typeof count === 'number' && count > 0 ? [`${count} ${count === 1 ? singular : plural}`] : []
  })
}

export function relativeToPar(value: number | null): string {
  if (value === null) return '—'
  if (value === 0) return 'E'
  return value > 0 ? `+${value}` : String(value)
}

function scoreLabel(hole: Pick<RoundScorecardEntry, 'score' | 'par'>): string | null {
  if (hole.score === null || hole.par === null) return null
  const difference = hole.score - hole.par
  if (hole.score === 1) return 'Hole-in-one'
  if (difference <= -3) return 'Albatross'
  if (difference === -2) return 'Eagle'
  if (difference === -1) return 'Birdie'
  if (difference === 0) return 'Par'
  if (difference === 1) return 'Bogey'
  if (difference === 2) return 'Double Bogey'
  if (difference === 3) return 'Triple Bogey'
  return `${difference} over par`
}

function conciseNote(note: string | null): string | null {
  const normalized = note?.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  return normalized.length > 90 ? `${normalized.slice(0, 89).trimEnd()}…` : normalized
}

export function selectRoundMoments(scorecard: Pick<RoundScorecardEntry, 'hole' | 'par' | 'score' | 'penalties' | 'chips' | 'player_note'>[]): {
  standout: HighlightMoment[]
  other: HighlightMoment[]
} {
  const sorted = [...scorecard].sort((a, b) => a.hole - b.hole)
  const standout = sorted
    .filter((hole) => {
      const label = scoreLabel(hole)
      return label === 'Hole-in-one' || label === 'Albatross' || label === 'Eagle' || label === 'Birdie'
    })
    .sort((a, b) => {
      const aDiff = a.score !== null && a.par !== null ? a.score - a.par : 0
      const bDiff = b.score !== null && b.par !== null ? b.score - b.par : 0
      return aDiff - bDiff || a.hole - b.hole
    })
    .slice(0, 3)
    .map((hole) => ({ hole: hole.hole, label: scoreLabel(hole), description: conciseNote(hole.player_note) }))

  const standoutHoles = new Set(standout.map((moment) => moment.hole))
  const other = sorted
    .filter((hole) => !standoutHoles.has(hole.hole))
    .map((hole): HighlightMoment | null => {
      const facts: string[] = []
      if (hole.penalties !== null && hole.penalties > 0) {
        facts.push(`${hole.penalties} ${hole.penalties === 1 ? 'penalty stroke' : 'penalty strokes'}`)
      }
      if (hole.chips !== null && hole.chips > 1) facts.push(`${hole.chips} chips`)
      const label = scoreLabel(hole)
      if (label === 'Double Bogey' || label === 'Triple Bogey' || (hole.score !== null && hole.par !== null && hole.score - hole.par > 3)) {
        facts.push((label ?? `${hole.score! - hole.par!} over par`).toLowerCase())
      }
      const note = conciseNote(hole.player_note)
      if (!facts.length && !note) return null
      return { hole: hole.hole, label: null, description: note ?? facts.join(' · ') }
    })
    .filter((moment): moment is HighlightMoment => moment !== null)
    .slice(0, 3)

  return { standout, other }
}