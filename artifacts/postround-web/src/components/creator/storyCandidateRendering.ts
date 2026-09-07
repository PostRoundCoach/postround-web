import type { ScorecardHole } from '@/lib/creator-stories/contracts'

export const SCORECARD_COLUMNS = [
  'Hole', 'Yards', 'Par', 'Score', 'Fairway', 'Green', 'Playable',
  'Chips', 'Putts', 'Sand', 'Penalties',
] as const

export function scorecardValue(
  row: ScorecardHole,
  key: Exclude<keyof ScorecardHole, 'hole'>,
): string {
  const value = row[key]
  if (value === undefined || value === null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function archetypeLabel(archetype: string): string {
  return archetype
}