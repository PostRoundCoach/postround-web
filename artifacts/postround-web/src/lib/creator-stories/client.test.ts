import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CreatorStoryApiError,
  fetchStoryCandidates,
  fetchOwnedActiveCreatorProfile,
  fetchPermissionedCreatorStories,
  generateStoryCandidates,
  dismissCreatorStory,
  requestStoryApproval,
  toCreatorStory,
} from './client.ts'

const candidate = {
  id: 'candidate-1',
  story_id: 'story-1',
  archetype: 'Drama',
  title: 'The turning point',
  hook: 'One hole changed the entire round.',
  summary: 'The player recovered after a difficult hole.',
  why_interesting: 'The scorecard shows a clear momentum swing.',
  supporting_evidence: ['Hole 8: Birdie.'],
  relevant_holes: [8],
  confidence: 0.86,
  suggested_format: 'Scorecard carousel',
  scorecard: [{ hole: 8, yards: 142, par: 3, score: 2, fairway: null, green: 'hit', playable: true, chips: 0, putts: 1, sand: false, penalties: 0 }],
}
const parsedCandidate = {
  ...candidate,
  evidence: [{ label: 'Stored evidence', detail: 'Hole 8: Birdie.' }],
  transcript_highlights: [],
}
delete (parsedCandidate as { supporting_evidence?: string[] }).supporting_evidence

const contentIdea = {
  id: 'idea-1',
  story_id: 'story-1',
  round_id: 'round-1',
  category: 'Putting Insight',
  title: '11 Putts: A Recipe for Par',
  hook: 'Only 11 putts over 9 holes?',
  script: 'Stored production script.',
  stats_used: { 'Total Putts': 11, 'Total Score': 34 },
  status: 'draft',
  created_at: '2026-09-09T17:56:36.250057+00:00',
}

test('projects only approved story fields and safely parses optional story data', () => {
  const story = toCreatorStory({
    id: 'story-1',
    story_type: 'personal_best',
    headline: 'A new personal best',
    summary: 'The approved summary',
    round_id: 'round-private',
    status: 'shared',
    story_data: {
      round_date: '2026-09-04',
      course_name: 'Waskesiu Golf Course',
      golfer_display_name: 'Aaron',
      supporting_facts: ['6/6 fairways', 42, '', null],
      private_notes: 'must not leave the integration boundary',
    },
  })

  assert.deepEqual(story, {
    id: 'story-1',
    storyType: 'personal_best',
    headline: 'A new personal best',
    summary: 'The approved summary',
    status: 'shared',
    roundDate: '2026-09-04',
    course: 'Waskesiu Golf Course',
    golferDisplayName: 'Aaron',
    supportingFacts: ['6/6 fairways'],
    permissionStatus: 'pending',
  })
  assert.equal('round_id' in story, false)
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

test('builds the queue only from active permissions for the resolved creator', async () => {
  const filters: Array<[string, unknown]> = []
  const permissionedStory = {
    id: 'shared-story',
    story_type: 'personal_best',
    headline: 'Shared headline',
    summary: 'Shared summary',
    story_data: {},
    round_id: 'shared-round',
    status: 'shared' as const,
  }

  const query = {
    select(value: string) {
      assert.match(value, /story_candidates!inner/)
      return this
    },
    eq(column: string, value: unknown) {
      filters.push([column, value])
      return this
    },
    is(column: string, value: unknown) {
      filters.push([column, value])
      return this
    },
    in(column: string, value: unknown) {
      filters.push([column, value])
      return this
    },
    then(
      resolve: (value: {
        data: Array<{
          story_id: string
          story_candidates: typeof permissionedStory
        }>
        error: null
      }) => unknown,
    ) {
      return Promise.resolve({
        data: [{
          story_id: 'shared-story',
          granted_at: '2026-09-08T20:00:00Z',
          story_candidates: permissionedStory,
        }],
        error: null,
      }).then(resolve)
    },
  }
  const supabase = {
    from(table: string) {
      assert.equal(table, 'story_permissions')
      return query
    },
  } as unknown as SupabaseClient

  const stories = await fetchPermissionedCreatorStories(supabase, 'creator-1')

  assert.equal(stories.length, 1)
  assert.equal(stories[0]?.id, 'shared-story')
  assert.equal(stories[0]?.permissionStatus, 'approved')
  assert.deepEqual(filters, [
    ['creator_id', 'creator-1'],
    ['permission_granted', true],
    ['revoked_at', null],
    ['story_candidates.status', ['offered', 'shared']],
  ])
})

test('sends only the story ID and bearer identity to the Story Engine', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test/'
  let request: { url: string; init?: RequestInit } | undefined
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init }
    return new Response(JSON.stringify({
      ok: true,
      count: 1,
      candidates: [candidate],
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
    const result = await generateStoryCandidates(supabase, { story_id: 'story-1' })

    assert.deepEqual(result, {
      ok: true,
      count: 1,
      candidates: [parsedCandidate],
      permission_status: 'pending',
    })
    assert.equal(
      request?.url,
      'https://api.postround.test/api/content/generate',
    )
    assert.equal(request?.init?.method, 'POST')
    assert.equal(
      (request?.init?.headers as Record<string, string>).Authorization,
      'Bearer test-access-token',
    )
    assert.deepEqual(JSON.parse(String(request?.init?.body)), {
      story_id: 'story-1',
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

test('a failed generation can be retried without mutating the source story', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  let attempts = 0
  globalThis.fetch = (async () => {
    attempts += 1
    if (attempts === 1) return new Response(null, { status: 500 })
    return new Response(JSON.stringify({
      ok: true,
      count: 1,
      candidates: [candidate],
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
  const request = { story_id: 'story-1' }

  try {
    await assert.rejects(
      generateStoryCandidates(supabase, request),
      CreatorStoryApiError,
    )
    assert.deepEqual(await generateStoryCandidates(supabase, request), {
      ok: true,
      count: 1,
      candidates: [parsedCandidate],
      permission_status: 'pending',
    })
    assert.deepEqual(request, {
      story_id: 'story-1',
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

test('preserves the safe backend stage on generation failures', async () => {
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
      generateStoryCandidates(supabase, { story_id: 'story-1' }),
      (error: unknown) => error instanceof CreatorStoryApiError
        && error.status === 502
        && error.stage === 'round_scorecard_lookup',
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
    assert.equal(retrieval.round_id, 'round-1')
    assert.equal(retrieval.ideas[0]?.title, '11 Putts: A Recipe for Par')
    assert.deepEqual(retrieval.ideas[0]?.stats_used, { 'Total Putts': 11, 'Total Score': 34 })
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
      round_id: 'round-1',
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
      round_id: 'round-1',
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

test('rejects malformed generated ideas instead of fabricating content', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test'
  globalThis.fetch = (async () => new Response(JSON.stringify({
    ok: true,
    ideas: [{ id: 'candidate-without-evidence' }],
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
      fetchStoryCandidates(supabase, 'story-1'),
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
