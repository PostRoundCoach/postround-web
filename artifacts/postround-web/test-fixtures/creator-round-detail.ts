// Entirely synthetic saved content; no live player data or generated API calls.
export function creatorRoundDetailFixture({
  omitScoreToPar = false,
  omitVoiceTranscript = false,
} = {}) {
  return {
    ok: true,
    contract: {
      round: {
        played_at: '2026-10-01', course_name: 'Fixture Course', tees: 'White',
        player_display_name: null as string | null,
      },
      roundHighlights: {
        total_score: 5, course_par: 4, ...(!omitScoreToPar ? { score_to_par: 1 } : {}),
        front_9: null, back_9: null, total_putts: 2, total_penalties: 0,
        fairways_hit: 1, total_fairways: 1, fairways_left: 0, fairways_right: 0,
        fairways_long: 0, fairways_short: 0, gir_hit: 0, total_gir: 1,
        gir_short: 1, gir_long: 0, gir_left: 0, gir_right: 0,
        scrambling_opportunities: 1, successful_scrambles: 0, three_putts: 0,
        birdies: 0, pars: 0, bogeys: 1, double_bogeys: 0, triple_bogeys: 0,
        eagles: 0, albatrosses: 0, hole_in_one: 0,
      },
      scorecard: [{
        hole: 1, par: 4, score: 5, fairway: 'hit', gir: 'short', putts: 2,
        chips: 1, bunker: false, sand_save: null, penalties: 0,
        player_note: 'Synthetic saved hole note.',
        ...(!omitVoiceTranscript ? { voice_transcript: 'Synthetic player words.' } : {}),
      }],
      creatorContentStory: {
        available: true, permissionState: 'granted',
        permission: {
          granted_at: '2026-10-01T12:34:56.123456+00:00',
          revoked_at: null, approval_requested_at: null,
        },
        candidate: {
          id: '20000000-0000-4000-8000-000000000001', story_type: 'progress',
          headline: 'Synthetic shared story', summary: 'Synthetic authorized summary.', status: 'shared',
        },
        contentIdea: {
          id: 'fixture-idea', category: 'Progress', title: 'Saved story title',
          hook: 'Saved story hook', story_angle: 'A synthetic story angle',
          script: 'Saved story first paragraph.\n\nSaved story second paragraph.',
          why_interesting: null, created_at: '2026-10-01T13:00:00Z',
        },
      },
      coachingReflection: {
        available: true,
        content: {
          id: 'fixture-reflection', title: 'Saved reflection title', hook: 'Saved reflection hook',
          reflection: 'Saved reflection first paragraph.\n\nSaved reflection second paragraph.',
          script: null, created_at: '2026-10-01T13:00:00Z',
        },
      },
    },
  }
}
