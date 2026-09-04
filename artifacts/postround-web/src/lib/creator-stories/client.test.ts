import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CreatorStoryApiError,
  fetchGeneratedCreatorStoryIdeas,
  fetchOwnedActiveCreatorProfile,
  fetchPermissionedCreatorStories,
  generateCreatorStoryContent,
  toCreatorStory,
} from './client.ts'

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
  assert.deepEqual(filters, [
    ['creator_id', 'creator-1'],
    ['permission_granted', true],
    ['revoked_at', null],
    ['story_candidates.status', ['offered', 'shared']],
  ])
})

test('sends bearer identity plus creator and story IDs to the existing endpoint', async () => {
  const originalFetch = globalThis.fetch
  const originalApiBase = process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL
  process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL = 'https://api.postround.test/'
  let request: { url: string; init?: RequestInit } | undefined
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init }
    return new Response(JSON.stringify({ ok: true, count: 3 }), {
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
    const result = await generateCreatorStoryContent(supabase, {
      creator_id: 'creator-1',
      story_id: 'story-1',
    })

    assert.deepEqual(result, { ok: true, count: 3 })
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
      creator_id: 'creator-1',
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
    return new Response(JSON.stringify({ ok: true, count: 1 }), {
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
  const request = { creator_id: 'creator-1', story_id: 'story-1' }

  try {
    await assert.rejects(
      generateCreatorStoryContent(supabase, request),
      CreatorStoryApiError,
    )
    assert.deepEqual(await generateCreatorStoryContent(supabase, request), {
      ok: true,
      count: 1,
    })
    assert.deepEqual(request, {
      creator_id: 'creator-1',
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

test('successful generation is followed by authenticated retrieval of persisted ideas', async () => {
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

    if (init?.method === 'POST') {
      return new Response(JSON.stringify({ ok: true, count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      ideas: [{
        id: 'idea-1',
        story_id: 'story-1',
        category: 'Round Analysis',
        title: 'The turning point',
        hook: 'One hole changed the entire round.',
        script: 'Here is how the round shifted.',
        created_at: '2026-09-04T12:00:00.000Z',
      }],
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
    const generation = await generateCreatorStoryContent(supabase, {
      creator_id: 'creator-1',
      story_id: 'story-1',
    })
    const retrieval = await fetchGeneratedCreatorStoryIdeas(supabase, 'story-1')

    assert.deepEqual(generation, { ok: true, count: 1 })
    assert.equal(retrieval.ideas[0]?.title, 'The turning point')
    assert.equal(retrieval.ideas[0]?.hook, 'One hole changed the entire round.')
    assert.equal(retrieval.ideas[0]?.script, 'Here is how the round shifted.')
    assert.deepEqual(requests, [
      {
        url: 'https://api.postround.test/api/content/generate',
        method: 'POST',
        body: JSON.stringify({
          creator_id: 'creator-1',
          story_id: 'story-1',
        }),
      },
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

    return new Response(JSON.stringify({ ok: true, ideas: [] }), {
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
      fetchGeneratedCreatorStoryIdeas(supabase, 'story-1'),
      CreatorStoryApiError,
    )
    assert.deepEqual(await fetchGeneratedCreatorStoryIdeas(supabase, 'story-1'), {
      ok: true,
      ideas: [],
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
    ideas: [{ id: 'idea-without-content' }],
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
      fetchGeneratedCreatorStoryIdeas(supabase, 'story-1'),
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
