import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CreatorStoryApiError,
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
