import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { permissionStatusFromDetail } from './approval-state.ts'
import {
  CreatorStoryApiError,
  CreatorStoryConfigurationError,
  fetchRoundContract,
  fetchStoryCandidates,
  fetchOwnedActiveCreatorProfile,
  fetchCreatorLandingSummary,
  fetchPermissionedCreatorStories,
  generateStoryCandidates,
  dismissCreatorStory,
  requestStoryApproval,
  toCreatorStory,
} from './client.ts'

const contentIdea = {
  id: 'idea-1',
  story_id: 'story-1',
  category: 'Putting Insight',
  title: '11 Putts: A Recipe for Par',
  hook: 'Only 11 putts over 9 holes?',
  script: 'Stored production script.',
  created_at: '2026-09-09T17:56:36.250057+00:00',
  round: {
    player_display_name: 'Aaron',
    played_at: '2026-09-01',
    course_name: 'Pebble Beach',
    tees: 'White',
    total_score: 92,
    course_par: 72,
    score_to_par: 20,
    front_9: 46,
    back_9: 46,
    total_putts: 27,
    total_penalties: 2,
    fairways_hit: 8,
    total_fairways: 14,
    fairways_left: 2,
    fairways_right: 2,
    fairways_long: 1,
    fairways_short: 1,
    fairways_missed: 6,
    fairways_playable: 4,
    gir_hit: 5,
    total_gir: 18,
    gir_short: 4,
    gir_long: 2,
    gir_left: 4,
    gir_right: 3,
    gir_missed: 13,
    gir_playable: 7,
    scrambling_opportunities: 9,
    successful_scrambles: 4,
    three_putts: 2,
    birdies: 1,
    pars: 8,
    bogeys: 7,
    double_bogeys: 2,
    triple_bogeys: 1,
    eagles: 2,
    albatrosses: 1,
    hole_in_one: 1,
    sand_save_opportunities: 3,
    successful_sand_saves: 2,
    scorecard: [
      {
        hole: 1,
        par: 4,
        score: 5,
        fairway: 'long',
        gir: 'long',
        putts: 2,
        chips: 1,
        bunker: false,
        sand_save: null,
        penalties: 0,
        player_note: 'Good drive, missed the green'
      }
    ]
  }
}

const studioCreator = {
  id: '10000000-0000-4000-8000-000000000002', name: 'Fixture Creator',
  capabilities: { advancedCreator: false, creatorVoice: false },
}
const minimalStory = {
  id: '20000000-0000-4000-8000-000000000001',
  round_id: '30000000-0000-4000-8000-000000000001',
  story_type: 'future_open_type', headline: 'Hit every fairway — 6 of 6',
  summary: 'Synthetic summary', status: 'shared' as const,
  created_at: '2020-01-01T00:00:00Z',
}

const roundContract = {
  round: {
    played_at: '2026-09-01',
    course_name: 'Pebble Beach',
    tees: 'White',
    player_display_name: 'Aaron',
  },
  roundHighlights: {
    total_score: 92, course_par: 72, score_to_par: 20, front_9: 46, back_9: 46, total_putts: 27,
    total_penalties: 2, fairways_hit: 8, total_fairways: 14, fairways_left: 2,
    fairways_right: 2, fairways_long: 1, fairways_short: 1, gir_hit: 5, total_gir: 18,
    gir_short: 4, gir_long: 2, gir_left: 4, gir_right: 3, scrambling_opportunities: 9,
    successful_scrambles: 4, three_putts: 2, birdies: 1, pars: 8, bogeys: 7,
    double_bogeys: 2, triple_bogeys: 0, eagles: 0, albatrosses: 0, hole_in_one: 0,
  },
  scorecard: [{
    hole: 1, par: 4, score: 5, fairway: 'long', gir: 'long', putts: 2, chips: 1,
    bunker: false, sand_save: null, penalties: 0, player_note: 'Good drive',
    voice_transcript: 'Full player words.\n\nAnother thought.',
  }],
  creatorContentStory: {
    available: true,
    permissionState: 'granted',
    permission: {
      granted_at: null,
      revoked_at: null,
      approval_requested_at: '2026-09-10T12:00:00Z',
    },
    candidate: {
      id: 'story-1', story_type: 'personal_best', headline: 'Shared headline',
      summary: 'Shared summary', status: 'shared',
    },
    contentIdea: {
      id: 'idea-1', category: 'Surprise', title: 'A turn', hook: 'The turn changed everything',
      script: null, story_angle: 'The comeback', why_interesting: null, created_at: '2026-09-10',
    },
  },
  coachingReflection: {
    available: true,
    content: {
      id: 'reflection-1', title: 'Reflection', hook: 'What changed?',
      reflection: 'Stored reflection', script: null, created_at: '2026-09-10',
    },
  },
}

test('Share with Creator approval response and granted detail agree without a second request timestamp', async () => {
  const originalFetch = globalThis.fetch
  const requests: string[] = []
  const supabase = { auth: { getSession: async () => ({
    data: { session: { access_token: 'synthetic-token' } },
  }) } } as unknown as SupabaseClient
  const oldOrigin = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.example.test'
  try {
    globalThis.fetch = (async (url) => {
      requests.push(String(url))
      if (String(url).endsWith('/approval-request')) return Response.json({
        ok: true, story_id: 'story-1', permission_status: 'approved',
      })
      return Response.json({ ok: true, contract: {
        ...roundContract,
        creatorContentStory: { ...roundContract.creatorContentStory, permission: {
          granted_at: '2026-01-01T00:00:00Z', approval_requested_at: null, revoked_at: null,
        } },
      } })
    }) as typeof fetch
    assert.equal((await requestStoryApproval(supabase, 'story-1')).permission_status, 'approved')
    const detail = (await fetchRoundContract(supabase, 'round-1')).contract.creatorContentStory
    assert.equal(detail.available, true)
    if (detail.available) assert.equal(permissionStatusFromDetail(detail.permission), 'approved')
    assert.equal(requests.length, 2)
  } finally {
    globalThis.fetch = originalFetch
    if (oldOrigin === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = oldOrigin
  }
})

test('loads and strictly parses the authenticated round contract', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  let request: { url: string; authorization: string | null } | undefined
  globalThis.fetch = (async (url, init) => {
    request = {
      url: String(url),
      authorization: new Headers(init?.headers).get('authorization'),
    }
    return Response.json({ ok: true, contract: roundContract })
  }) as typeof fetch
  const supabase = { auth: { async getSession() {
    return { data: { session: { access_token: 'round-token' } }, error: null }
  } } } as unknown as SupabaseClient
  try {
    const result = await fetchRoundContract(supabase, 'round-1')
    assert.deepEqual(Object.keys(result.contract).sort(), [
      'coachingReflection',
      'creatorContentStory',
      'round',
      'roundHighlights',
      'scorecard',
    ])
    assert.equal(result.contract.creatorContentStory.available, true)
    assert.equal(result.contract.coachingReflection.available, true)
    assert.equal(result.contract.scorecard[0]?.player_note, 'Good drive')
    assert.equal(result.contract.roundHighlights.score_to_par, 20)
    assert.equal(result.contract.roundHighlights.triple_bogeys, 0)
    assert.equal(result.contract.scorecard[0]?.voice_transcript, 'Full player words.\n\nAnother thought.')
    assert.equal('roundBuddyMessages' in result.contract, false)
    assert.deepEqual(request, {
      url: 'https://api.postround.test/api/content/round/round-1',
      authorization: 'Bearer round-token',
    })
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('rejects malformed round contracts without weakening documented nullability', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  globalThis.fetch = (async () => Response.json({
    ok: true,
    contract: {
      ...roundContract,
      round: { ...roundContract.round, played_at: null },
    },
  })) as typeof fetch
  const supabase = { auth: { async getSession() {
    return { data: { session: { access_token: 'round-token' } }, error: null }
  } } } as unknown as SupabaseClient
  try {
    await assert.rejects(
      fetchRoundContract(supabase, 'round-1'),
      (error: unknown) => error instanceof CreatorStoryApiError && error.status === 500,
    )
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('rejects malformed transcripts without fabricating text; nullable attribution stays nullable', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const supabase = { auth: { async getSession() {
    return { data: { session: { access_token: 'round-token' } }, error: null }
  } } } as unknown as SupabaseClient
  try {
    for (const transcript of [undefined, 42, { content: 'assistant text' }]) {
      globalThis.fetch = (async () => Response.json({
        ok: true, contract: { ...roundContract, scorecard: [
          { ...roundContract.scorecard[0], voice_transcript: transcript },
        ] },
      })) as typeof fetch
      await assert.rejects(fetchRoundContract(supabase, 'round-1'), CreatorStoryApiError)
    }
    globalThis.fetch = (async () => Response.json({
      ok: true, contract: { ...roundContract, scorecard: [
        { ...roundContract.scorecard[0], voice_transcript: null },
      ], round: {
        ...roundContract.round, course_name: null, player_display_name: null,
      } },
    })) as typeof fetch
    assert.equal((await fetchRoundContract(supabase, 'round-1')).contract.round.player_display_name, null)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('projects minimal candidate fields without fabricating consent or metadata', () => {
  const story = toCreatorStory({
    id: 'story-1',
    story_type: 'personal_best',
    headline: 'A new personal best',
    summary: 'The approved summary',
    round_id: 'round-private',
    status: 'shared',
    created_at: '2026-09-04T12:00:00Z',
  })

  assert.deepEqual(story, {
    id: 'story-1',
    roundId: 'round-private',
    storyType: 'personal_best',
    headline: 'A new personal best',
    summary: 'The approved summary',
    status: 'shared',
    createdAt: '2026-09-04T12:00:00Z',
  })
  assert.equal(story.roundId, 'round-private')
  assert.equal('private_notes' in story, false)
})

test('resolves the active creator profile from the authenticated user identity', async () => {
  const filters: Array<[string, string]> = []
  const profile = {
    id: 'creator-1',
    display_name: 'Creator',
    bio: null,
    avatar_url: null,
    status: 'active' as const,
    created_at: '2026-09-04',
    updated_at: '2026-09-04',
    creator_social_accounts: [],
  }

  const query = {
    select() {
      return this
    },
    eq(column: string, value: string) {
      filters.push([column, value])
      return this
    },
    async maybeSingle() {
      return { data: profile, error: null }
    },
  }
  const supabase = {
    auth: {
      async getUser() {
        return { data: { user: { id: 'user-1' } }, error: null }
      },
    },
    from(table: string) {
      assert.equal(table, 'creator_profiles')
      return query
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await fetchOwnedActiveCreatorProfile(supabase), profile)
  assert.deepEqual(filters, [
    ['user_id', 'user-1'],
    ['status', 'active'],
  ])
})

test('landing summary uses bearer identity and exact nested counts including zero', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  let request: { url: string; headers: Headers; cache: RequestCache | undefined } | undefined
  const supabase = { auth: { async getSession() {
    return { data: { session: { access_token: 'summary-token' } }, error: null }
  } } } as unknown as SupabaseClient
  try {
    globalThis.fetch = (async (url, init) => {
      request = { url: String(url), headers: new Headers(init?.headers), cache: init?.cache }
      return Response.json({ ok: true, creator: studioCreator, summary: { storyCount: 0 } })
    }) as typeof fetch
    assert.deepEqual(await fetchCreatorLandingSummary(supabase), {
      creator: studioCreator, summary: { storyCount: 0 },
    })
    assert.equal(request?.url, 'https://api.postround.test/api/content/creator-summary')
    assert.equal(request?.headers.get('Authorization'), 'Bearer summary-token')
    assert.equal(request?.cache, 'no-store')
    for (const count of [null, undefined, -1, 1.5, '4', Number.MAX_SAFE_INTEGER + 1]) {
      globalThis.fetch = (async () => Response.json({ ok: true, creator: studioCreator, summary: { storyCount: count } })) as typeof fetch
      await assert.rejects(fetchCreatorLandingSummary(supabase), CreatorStoryApiError)
    }
    globalThis.fetch = (async () => Response.json({ ok: true, creator: studioCreator, summary: { storyCount: 12 } })) as typeof fetch
    assert.equal((await fetchCreatorLandingSummary(supabase)).summary.storyCount, 12)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('accepts canonical seven-field stories and authoritative creator without extra metadata', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  globalThis.fetch = (async () => Response.json({
    ok: true,
    creator: studioCreator,
    stories: [minimalStory],
  })) as typeof fetch
  const supabase = { auth: { async getSession() {
    return { data: { session: { access_token: 'test-access-token' } }, error: null }
  } } } as unknown as SupabaseClient
  try {
    const { stories, creator } = await fetchPermissionedCreatorStories(supabase)
    assert.deepEqual(creator, studioCreator)
    assert.equal(stories[0]?.headline, 'Hit every fairway — 6 of 6')
    assert.equal(stories[0]?.createdAt, '2020-01-01T00:00:00Z')
    assert.equal('permissionStatus' in stories[0], false)
    assert.equal('significanceScore' in stories[0], false)
    globalThis.fetch = (async () => Response.json({
      ok: true, creator: studioCreator, stories: [{ ...minimalStory, significance_score: 78 }],
    })) as typeof fetch
    assert.equal((await fetchPermissionedCreatorStories(supabase)).stories[0].significanceScore, 78)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('rejects invalid required candidate fields without guessing', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const supabase = { auth: { async getSession() {
    return { data: { session: { access_token: 'test-access-token' } }, error: null }
  } } } as unknown as SupabaseClient
  const baseStory = minimalStory
  try {
    for (const invalid of [
      { headline: undefined },
      { round_id: 'not-a-uuid' },
      { summary: null },
      { status: 'draft' },
      { significance_score: null },
      { significance_score: '78' },
      { significance_score: -1 },
      { significance_score: 101 },
      { significance_score: 78.5 },
      { created_at: undefined },
      { created_at: 'not a date' },
    ]) {
      globalThis.fetch = (async () => Response.json({
        ok: true, creator: studioCreator, stories: [{ ...baseStory, ...invalid }],
      })) as typeof fetch
      await assert.rejects(fetchPermissionedCreatorStories(supabase), CreatorStoryApiError)
    }
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('validated empty is the only empty list; errors and private responses never become empty', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const supabase = { auth: { async getSession() {
    return { data: { session: { access_token: 'synthetic-token' } }, error: null }
  } } } as unknown as SupabaseClient
  try {
    globalThis.fetch = (async () => Response.json({ ok: true, creator: studioCreator, stories: [] })) as typeof fetch
    assert.deepEqual((await fetchPermissionedCreatorStories(supabase)).stories, [])
    for (const payload of [
      {}, { ok: true, stories: [] }, { ok: false, creator: studioCreator, stories: [] },
      { ok: true, creator: { ...studioCreator, capabilities: {} }, stories: [] },
      { ok: true, creator: studioCreator, stories: null },
    ]) {
      globalThis.fetch = (async () => Response.json(payload)) as typeof fetch
      await assert.rejects(fetchPermissionedCreatorStories(supabase), CreatorStoryApiError)
      await assert.rejects(fetchCreatorLandingSummary(supabase), CreatorStoryApiError)
    }
    for (const status of [401, 403, 404, 500]) {
      globalThis.fetch = (async () => Response.json({ error: 'PRIVATE credential diagnostic' }, { status })) as typeof fetch
      await assert.rejects(fetchPermissionedCreatorStories(supabase), (e: unknown) =>
        e instanceof CreatorStoryApiError && e.status === status && !e.message.includes('PRIVATE'))
    }
    for (const response of [
      new Response('<html>routing</html>', { headers: { 'Content-Type': 'text/html' } }),
      new Response('{', { headers: { 'Content-Type': 'application/json' } }),
      Response.json({ ok: true, creator: studioCreator, stories: [] }, { status: 201 }),
    ]) {
      globalThis.fetch = (async () => response.clone()) as typeof fetch
      await assert.rejects(fetchPermissionedCreatorStories(supabase), CreatorStoryApiError)
      await assert.rejects(fetchCreatorLandingSummary(supabase), CreatorStoryApiError)
    }
    globalThis.fetch = (async () => { throw new TypeError('Network unavailable') }) as typeof fetch
    await assert.rejects(fetchPermissionedCreatorStories(supabase))
    const abort = new AbortController()
    abort.abort()
    await assert.rejects(fetchPermissionedCreatorStories(supabase, { signal: abort.signal }),
      (e: unknown) => e instanceof Error && e.name === 'AbortError')
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('generation sends creator identity only on POST, then reads the narrow ideas contract', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test/'
  let request: { url: string; init?: RequestInit } | undefined
  const requests: Array<{ url: string; init?: RequestInit }> = []
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init }
    requests.push(request)
    const payload = init?.method === 'POST'
      ? { ok: true, count: 1 }
      : { ok: true, story_id: 'story-1', ideas: [contentIdea], permission_status: 'pending' }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient

  try {
    const result = await generateStoryCandidates(supabase, {
      story_id: 'story-1',
      creator_id: 'creator-1',
    })

    assert.deepEqual(result, {
      ok: true,
      count: 1,
      ideas: [contentIdea],
      permission_status: 'pending',
    })
    assert.equal(
      requests[0]?.url,
      'https://api.postround.test/api/content/generate',
    )
    assert.equal(requests[0]?.init?.method, 'POST')
    assert.equal(
      (requests[0]?.init?.headers as Record<string, string>).Authorization,
      'Bearer test-access-token',
    )
    assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
      story_id: 'story-1',
      creator_id: 'creator-1',
    })
    assert.equal(requests[1]?.url, 'https://api.postround.test/api/content/ideas?story_id=story-1')
    assert.equal(requests[1]?.init?.method, 'GET')
    assert.equal(requests[1]?.init?.body, undefined)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) {
      delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('fails visibly instead of falling back to an unhandled same-site API route', async () => {
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient

  try {
    await assert.rejects(
      () => fetchStoryCandidates(supabase, 'story-1'),
      CreatorStoryConfigurationError,
    )
  } finally {
    if (originalApiBase !== undefined) {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('a failed generation can be retried without mutating the source story', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  let attempts = 0
  globalThis.fetch = (async (_url, init) => {
    attempts += 1
    if (attempts === 1) return new Response(null, { status: 500 })
    const payload = init?.method === 'POST'
      ? { ok: true, count: 1 }
      : { ok: true, story_id: 'story-1', ideas: [contentIdea], permission_status: 'pending' }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient
  const request = { story_id: 'story-1', creator_id: 'creator-1' }

  try {
    await assert.rejects(
      generateStoryCandidates(supabase, request),
      CreatorStoryApiError,
    )
    assert.deepEqual(await generateStoryCandidates(supabase, request), {
      ok: true,
      count: 1,
      ideas: [contentIdea],
      permission_status: 'pending',
    })
    assert.deepEqual(request, {
      story_id: 'story-1',
      creator_id: 'creator-1',
    })
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) {
      delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('retains failure status without echoing private backend diagnostics', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  globalThis.fetch = (async () => new Response(JSON.stringify({
    error: 'The round evidence could not be loaded.',
    stage: 'round_scorecard_lookup',
  }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch
  const supabase = {
    auth: {
      async getSession() {
        return { data: { session: { access_token: 'test-access-token' } }, error: null }
      },
    },
  } as unknown as SupabaseClient

  try {
    await assert.rejects(
      generateStoryCandidates(supabase, { story_id: 'story-1', creator_id: 'creator-1' }),
      (error: unknown) => error instanceof CreatorStoryApiError
        && error.status === 502
        && error.stage === null
        && error.message === 'Content generation could not be completed.',
    )
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('authenticated retrieval loads persisted round ideas without regeneration', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test/'
  const requests: Array<{ url: string; method: string; body?: string }> = []

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body ? String(init.body) : undefined,
    })

    return new Response(JSON.stringify({
      ok: true,
      story_id: 'story-1',
      round_id: 'round-1',
      ideas: [contentIdea],
      permission_status: 'pending',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient

  try {
    const retrieval = await fetchStoryCandidates(supabase, 'story-1')

    assert.equal(retrieval.story_id, 'story-1')
    assert.equal(retrieval.ideas[0]?.title, '11 Putts: A Recipe for Par')
    assert.equal(retrieval.ideas[0]?.round?.score_to_par, 20)
    assert.equal(retrieval.ideas[0]?.round?.scorecard[0]?.fairway, 'long')
    assert.equal(retrieval.ideas[0]?.round?.scorecard[0]?.player_note, 'Good drive, missed the green')
    assert.deepEqual(Object.keys(retrieval.ideas[0] ?? {}).sort(), [
      'category', 'created_at', 'hook', 'id', 'round', 'script', 'story_id', 'title',
    ])
    assert.deepEqual(requests, [
      {
        url: 'https://api.postround.test/api/content/ideas?story_id=story-1',
        method: 'GET',
        body: undefined,
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) {
      delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('retrieval retry calls only the creator ideas endpoint and never regenerates', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const methods: string[] = []
  const urls: string[] = []

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    methods.push(init?.method ?? 'GET')
    urls.push(String(url))

    if (methods.length === 1) return new Response(null, { status: 503 })

    return new Response(JSON.stringify({
      ok: true,
      story_id: 'story-1',
      ideas: [],
      permission_status: 'pending',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient

  try {
    await assert.rejects(
      fetchStoryCandidates(supabase, 'story-1'),
      CreatorStoryApiError,
    )
    assert.deepEqual(await fetchStoryCandidates(supabase, 'story-1'), {
      ok: true,
      story_id: 'story-1',
      ideas: [],
      permission_status: 'pending',
    })
    assert.deepEqual(methods, ['GET', 'GET'])
    assert.ok(urls.every((url) => url.endsWith('/api/content/ideas?story_id=story-1')))
    assert.ok(urls.every((url) => !url.includes('/api/admin/content-ideas')))
    assert.ok(urls.every((url) => !url.endsWith('/api/content/generate')))
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) {
      delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('initial retrieval waits for browser session hydration before issuing the GET', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const requests: Array<{ url: string; method: string }> = []
  const hydrate: Array<(session: { access_token: string }) => void> = []
  let unsubscribed = false
  globalThis.fetch = (async (url, init) => {
    requests.push({ url: String(url), method: init?.method ?? 'GET' })
    return Response.json({
      ok: true,
      story_id: 'story-1',
      ideas: [contentIdea],
      permission_status: 'pending',
    })
  }) as typeof fetch
  const supabase = {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null }
      },
      onAuthStateChange(callback: (_event: string, session: { access_token: string }) => void) {
        hydrate.push((session) => callback('INITIAL_SESSION', session))
        return { data: { subscription: { unsubscribe() { unsubscribed = true } } } }
      },
    },
  } as unknown as SupabaseClient

  try {
    const retrieval = fetchStoryCandidates(supabase, 'story-1')
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepEqual(requests, [])
    hydrate.forEach((callback) => callback({ access_token: 'hydrated-token' }))
    assert.equal((await retrieval).ideas[0]?.id, 'idea-1')
    assert.deepEqual(requests, [{
      url: 'https://api.postround.test/api/content/ideas?story_id=story-1',
      method: 'GET',
    }])
    assert.equal(unsubscribed, true)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('concurrent story retrieval stays isolated and an aborted stale request cannot fetch', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const requestedStories: string[] = []
  const hydrate: Array<(session: { access_token: string }) => void> = []
  const supabase = {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null }
      },
      onAuthStateChange(callback: (_event: string, session: { access_token: string }) => void) {
        hydrate.push((session) => callback('INITIAL_SESSION', session))
        return { data: { subscription: { unsubscribe() {} } } }
      },
    },
  } as unknown as SupabaseClient
  globalThis.fetch = (async (url) => {
    const id = new URL(String(url)).searchParams.get('story_id')!
    requestedStories.push(id)
    if (id === 'story-failed') {
      return Response.json({ error: 'Story access changed.', stage: 'authorization' }, { status: 403 })
    }
    return Response.json({ ok: true, story_id: id, ideas: [], permission_status: 'pending' })
  }) as typeof fetch

  try {
    const aborted = new AbortController()
    const stale = fetchStoryCandidates(supabase, 'story-stale', { signal: aborted.signal })
    aborted.abort()
    await assert.rejects(stale, (error: unknown) => error instanceof Error && error.name === 'AbortError')

    const failed = fetchStoryCandidates(supabase, 'story-failed')
    const successful = fetchStoryCandidates(supabase, 'story-success')
    await new Promise((resolve) => setTimeout(resolve, 0))
    hydrate.forEach((callback) => callback({ access_token: 'hydrated-token' }))
    await assert.rejects(
      failed,
      (error: unknown) => error instanceof CreatorStoryApiError
        && error.status === 403
        && error.stage === null
        && error.message === 'Generated content could not be loaded.',
    )
    assert.equal((await successful).story_id, 'story-success')
    assert.deepEqual(requestedStories.sort(), ['story-failed', 'story-success'])
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('initial card requests are bounded and a transient 429 retries through the same GET', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  let active = 0
  let peakActive = 0
  const attempts = new Map<string, number>()
  globalThis.fetch = (async (url, init) => {
    const storyId = new URL(String(url)).searchParams.get('story_id')!
    assert.equal(init?.method, 'GET')
    active += 1
    peakActive = Math.max(peakActive, active)
    await new Promise((resolve) => setTimeout(resolve, 10))
    active -= 1
    const attempt = (attempts.get(storyId) ?? 0) + 1
    attempts.set(storyId, attempt)
    if (storyId === 'story-2' && attempt === 1) {
      return Response.json({
        error: 'The Story Engine data source could not complete this request.',
        stage: 'authorization',
      }, { status: 429 })
    }
    return Response.json({
      ok: true,
      story_id: storyId,
      ideas: [],
      permission_status: 'pending',
    })
  }) as typeof fetch
  const supabase = {
    auth: {
      async getSession() {
        return { data: { session: { access_token: 'test-access-token' } }, error: null }
      },
    },
  } as unknown as SupabaseClient

  try {
    const results = await Promise.all(
      ['story-1', 'story-2', 'story-3', 'story-4'].map((id) =>
        fetchStoryCandidates(supabase, id)),
    )
    assert.deepEqual(results.map(({ story_id }) => story_id), [
      'story-1', 'story-2', 'story-3', 'story-4',
    ])
    assert.equal(peakActive, 2)
    assert.equal(attempts.get('story-2'), 2)
    assert.equal([...attempts.values()].reduce((sum, count) => sum + count, 0), 5)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('rejects malformed generated ideas instead of fabricating content', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient

  const runRejectionTest = async (ideas: unknown[]) => {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      ok: true, story_id: 'story-1', permission_status: 'pending', ideas,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
    await assert.rejects(
      fetchStoryCandidates(supabase, 'story-1'),
      CreatorStoryApiError,
    )
  }

  try {
    await runRejectionTest([{ id: 'candidate-without-evidence' }])

    // Malformed required enum
    await runRejectionTest([{ ...contentIdea, round: { ...contentIdea.round, scorecard: [{ ...contentIdea.round.scorecard[0], fairway: 'middle' }] } }])
    // Malformed hole number (string instead of int)
    await runRejectionTest([{ ...contentIdea, round: { ...contentIdea.round, scorecard: [{ ...contentIdea.round.scorecard[0], hole: '1' }] } }])

    // Unsorted holes
    await runRejectionTest([{ ...contentIdea, round: { ...contentIdea.round, scorecard: [
      { ...contentIdea.round.scorecard[0], hole: 2 },
      { ...contentIdea.round.scorecard[0], hole: 1 },
    ] } }])

    // Missing required key on round object
    const missingKeyRound = { ...contentIdea.round } as any
    delete missingKeyRound.total_score
    await runRejectionTest([{ ...contentIdea, round: missingKeyRound }])

    // Accept perfectly valid legacy null round
    globalThis.fetch = (async () => new Response(JSON.stringify({
      ok: true, story_id: 'story-1', permission_status: 'pending', ideas: [{ ...contentIdea, round: null }],
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
    const result = await fetchStoryCandidates(supabase, 'story-1')
    assert.equal(result.ideas[0]?.round, null)

  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) {
      delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('preserves canonical nullable metrics and accepts zero separately', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const supabase = { auth: { async getSession() {
    return { data: { session: { access_token: 'test-access-token' } }, error: null }
  } } } as unknown as SupabaseClient
  try {
    for (const value of [null, 0]) {
      globalThis.fetch = (async () => Response.json({
        ok: true, story_id: 'story-1', permission_status: 'pending',
        ideas: [{ ...contentIdea, round: { ...contentIdea.round, three_putts: value } }],
      })) as typeof fetch
      const result = await fetchStoryCandidates(supabase, 'story-1')
      assert.equal(result.ideas[0]?.round?.three_putts, value)
    }
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})

test('dismisses only the creator queue row through the authoritative API with bearer auth', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test/'
  let request: { url: string; init?: RequestInit } | undefined
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init }
    return new Response(JSON.stringify({ ok: true, story_id: 'story/one' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient

  try {
    assert.deepEqual(await dismissCreatorStory(supabase, 'story/one'), {
      ok: true,
      story_id: 'story/one',
    })
    assert.equal(
      request?.url,
      'https://api.postround.test/api/content/stories/story%2Fone/dismissal',
    )
    assert.equal(request?.init?.method, 'PATCH')
    assert.equal(request?.init?.body, undefined)
    assert.equal(
      (request?.init?.headers as Record<string, string>).Authorization,
      'Bearer test-access-token',
    )
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) {
      delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('failed revocation remains retryable and 409 is not fabricated as success', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  let attempts = 0
  globalThis.fetch = (async () => {
    attempts += 1
    if (attempts === 1) return new Response(null, { status: 409 })
    return new Response(JSON.stringify({ ok: true, story_id: 'story-1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient

  try {
    await assert.rejects(
      dismissCreatorStory(supabase, 'story-1'),
      (error: unknown) => error instanceof CreatorStoryApiError && error.status === 409,
    )
    assert.deepEqual(await dismissCreatorStory(supabase, 'story-1'), {
      ok: true,
      story_id: 'story-1',
    })
    assert.equal(attempts, 2)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) {
      delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('revocation rejects a malformed success response', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  globalThis.fetch = (async () => new Response(JSON.stringify({
    ok: true,
    story_id: 'different-story',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch

  const supabase = {
    auth: {
      async getSession() {
        return {
          data: { session: { access_token: 'test-access-token' } },
          error: null,
        }
      },
    },
  } as unknown as SupabaseClient

  try {
    await assert.rejects(
      dismissCreatorStory(supabase, 'story-1'),
      CreatorStoryApiError,
    )
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) {
      delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
    }
  }
})

test('requests approval idempotently without claiming player approval', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  const requests: Array<{ url: string; init?: RequestInit }> = []
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init })
    return Response.json({
      ok: true,
      story_id: 'story-1',
      permission_status: 'pending',
    })
  }) as typeof fetch
  const supabase = {
    auth: {
      async getSession() {
        return { data: { session: { access_token: 'test-access-token' } }, error: null }
      },
    },
  } as unknown as SupabaseClient

  try {
    assert.deepEqual(await requestStoryApproval(supabase, 'story-1'), {
      ok: true,
      story_id: 'story-1',
      permission_status: 'pending',
    })
    assert.equal(requests[0]?.url, 'https://api.postround.test/api/content/stories/story-1/approval-request')
    assert.equal(requests[0]?.init?.method, 'POST')
    assert.equal(requests[0]?.init?.body, '{}')
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
    else process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = originalApiBase
  }
})
