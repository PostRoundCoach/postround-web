import http from 'node:http'

const users = {
  'player@example.test': {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'player@example.test',
    creator: false,
  },
  'creator@example.test': {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'creator@example.test',
    creator: true,
  },
}
let delays = { login: 0, profile: 0, stories: 0 }
let failLogin = false
let creatorAllowed = true
let failProfile = false

const storyId = '20000000-0000-4000-8000-000000000001'
const creatorId = '10000000-0000-4000-8000-000000000002'
const publicCreators = {
  'creator-fixture': {
    display_name: 'Creator Fixture',
    bio: 'Golf stories, honest rounds, and the lessons between the shots.',
    avatar_url: 'https://images.example.test/creator-fixture.jpg',
    creator_social_accounts: [
      {
        platform: 'Instagram',
        handle: '@creatorfixture',
        profile_url: 'https://instagram.com/creatorfixture',
      },
      {
        platform: 'YouTube',
        handle: 'Creator Fixture Golf',
        profile_url: 'https://youtube.com/@creatorfixture',
      },
    ],
  },
  'second-creator': {
    display_name: 'Second Creator',
    bio: null,
    avatar_url: null,
    creator_social_accounts: [],
  },
}
const story = {
  id: storyId,
  story_id: storyId,
  story_type: 'round_recap',
  headline: 'A comeback worth sharing',
  summary: 'A fixture story shared with the creator.',
  story_data: {
    round_date: '2026-01-02',
    course_name: 'Fixture Golf Club',
    golfer_display_name: 'Fixture Golfer',
    supporting_facts: ['Recovered on the back nine'],
  },
  round_id: '30000000-0000-4000-8000-000000000001',
  status: 'shared',
}
let dismissed = false
let approved = false
let approvalRequested = false
const candidate = {
  id: '40000000-0000-4000-8000-000000000001',
  story_id: storyId,
  round_id: story.round_id,
  category: 'Round Analysis',
  title: 'The back-nine comeback',
  hook: 'A comeback worth sharing',
  script: 'Fixture candidate summary.',
  status: 'draft',
  created_at: '2026-01-02T00:00:00.000Z',
  round: {
    player_display_name: 'Fixture Golfer',
    played_at: '2026-01-02',
    course_name: 'Fixture Golf Club',
    tees: 'White',
    total_score: 85,
    course_par: 72,
    score_to_par: 13,
    front_9: 45,
    back_9: 40,
    total_putts: 31,
    total_penalties: 1,
    fairways_hit: 8,
    total_fairways: 14,
    fairways_left: 3,
    fairways_right: 2,
    fairways_long: null,
    fairways_short: 1,
    fairways_missed: 6,
    fairways_playable: 4,
    gir_hit: 7,
    total_gir: 18,
    gir_short: 4,
    gir_long: 2,
    gir_left: 3,
    gir_right: 2,
    gir_missed: 11,
    gir_playable: 6,
    scrambling_opportunities: 11,
    successful_scrambles: 5,
    three_putts: 2,
    birdies: 1,
    pars: 7,
    bogeys: 8,
    double_bogeys: 2,
    triple_bogeys: 0,
    eagles: 0,
    albatrosses: 0,
    hole_in_one: 0,
    sand_save_opportunities: 2,
    successful_sand_saves: 1,
    scorecard: [
      {
        hole: 1,
        par: 4,
        score: 4,
        fairway: 'hit',
        gir: 'hit',
        putts: 2,
        chips: null,
        bunker: null,
        sand_save: null,
        penalties: null,
        player_note: 'Stayed patient after the approach finished short.'
      }
    ]
  }
}

const roundContract = {
  round: {
    played_at: candidate.round.played_at,
    course_name: candidate.round.course_name,
    tees: candidate.round.tees,
    player_display_name: candidate.round.player_display_name,
    input_method: 'round_buddy',
  },
  roundHighlights: {
    total_score: candidate.round.total_score,
    course_par: candidate.round.course_par,
    score_to_par: candidate.round.score_to_par,
    front_9: candidate.round.front_9,
    back_9: candidate.round.back_9,
    total_putts: candidate.round.total_putts,
    total_penalties: candidate.round.total_penalties,
    fairways_hit: candidate.round.fairways_hit,
    total_fairways: candidate.round.total_fairways,
    fairways_left: candidate.round.fairways_left,
    fairways_right: candidate.round.fairways_right,
    fairways_long: candidate.round.fairways_long,
    fairways_short: candidate.round.fairways_short,
    gir_hit: candidate.round.gir_hit,
    total_gir: candidate.round.total_gir,
    gir_short: candidate.round.gir_short,
    gir_long: candidate.round.gir_long,
    gir_left: candidate.round.gir_left,
    gir_right: candidate.round.gir_right,
    scrambling_opportunities: candidate.round.scrambling_opportunities,
    successful_scrambles: candidate.round.successful_scrambles,
    three_putts: candidate.round.three_putts,
    birdies: candidate.round.birdies,
    pars: candidate.round.pars,
    bogeys: candidate.round.bogeys,
    double_bogeys: candidate.round.double_bogeys,
    triple_bogeys: candidate.round.triple_bogeys,
    eagles: candidate.round.eagles,
    albatrosses: candidate.round.albatrosses,
    hole_in_one: candidate.round.hole_in_one,
  },
  scorecard: candidate.round.scorecard,
  roundBuddyMessages: [
    { id: 'quip-1', content: 'The putt found the center of the cup.', hole_number: 4 },
    { id: 'quip-2', content: 'You kept your composure.', hole_number: null },
  ],
  creatorContentStory: {
    available: true,
    permissionState: 'granted',
    permission: {
      granted_at: approved ? '2026-01-03T00:00:00.000Z' : null,
      revoked_at: null,
      approval_requested_at: approvalRequested ? '2026-01-03T00:00:00.000Z' : null,
    },
    candidate: {
      id: story.id,
      story_type: story.story_type,
      headline: story.headline,
      summary: story.summary,
      status: story.status,
    },
    contentIdea: {
      id: candidate.id,
      category: candidate.category,
      title: candidate.title,
      hook: candidate.hook,
      script: candidate.script,
      story_angle: null,
      why_interesting: null,
      created_at: candidate.created_at,
    },
  },
  coachingReflection: {
    available: true,
    content: {
      id: '50000000-0000-4000-8000-000000000001',
      title: 'Patience changed the back nine',
      hook: 'The response after the turn mattered most.',
      reflection: 'The round stabilized when the player stayed patient.',
      script: null,
      created_at: '2026-01-02T00:05:00.000Z',
    },
  },
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function tokenFor(user) {
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: user.email,
    role: 'authenticated',
    sub: user.id,
  })}.e2e-signature`
}

function userResponse(user) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function userFromRequest(request) {
  const token = request.headers.authorization?.replace(/^Bearer /, '')
  if (!token) return null

  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return Object.values(users).find((user) => user.id === payload.sub) ?? null
  } catch {
    return null
  }
}

function send(response, status, body) {
  response.writeHead(status, {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(body))
}

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    return send(response, 200, {})
  }

  const url = new URL(request.url ?? '/', 'http://127.0.0.1:54321')

  if (request.method === 'POST' && url.pathname === '/__test/config') {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      const config = JSON.parse(body || '{}')
      delays = { login: 0, profile: 0, stories: 0, ...config.delays }
      failLogin = Boolean(config.failLogin)
      creatorAllowed = config.creatorAllowed !== false
      failProfile = Boolean(config.failProfile)
      send(response, 200, {})
    })
    return
  }

  if (request.method === 'POST' && url.pathname === '/auth/v1/token') {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      let credentials
      try {
        credentials = body ? JSON.parse(body) : {}
      } catch {
        return send(response, 400, { message: 'Invalid token request' })
      }

      const grantType = url.searchParams.get('grant_type')
      const user = grantType === 'refresh_token'
        ? Object.values(users).find(({ id }) => credentials.refresh_token === `refresh-${id}`)
        : users[credentials.email]
      if (!user) return send(response, 400, { message: 'Invalid login credentials' })
      if (failLogin) return setTimeout(() => send(response, 503, { message: 'Sign in temporarily unavailable' }), delays.login)

      setTimeout(() => send(response, 200, {
        access_token: tokenFor(user),
        expires_in: 3600,
        refresh_token: `refresh-${user.id}`,
        token_type: 'bearer',
        user: userResponse(user),
      }), delays.login)
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/auth/v1/user') {
    const user = userFromRequest(request)
    return user
      ? send(response, 200, userResponse(user))
      : send(response, 401, { message: 'Invalid token' })
  }

  if (request.method === 'POST' && url.pathname === '/auth/v1/logout') {
    return send(response, 200, {})
  }

  if (request.method === 'POST' && url.pathname === '/rest/v1/rpc/get_public_creator_by_slug') {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      let input
      try {
        input = body ? JSON.parse(body) : {}
      } catch {
        return send(response, 400, { message: 'Invalid public creator request' })
      }

      return send(response, 200, publicCreators[input.requested_slug] ?? null)
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/content/stories') {
    return setTimeout(() => send(response, 200, {
      ok: true,
      stories: dismissed ? [] : [{
        ...story,
        permission_status: approved ? 'approved' : approvalRequested ? 'requested' : 'pending',
      }],
    }), delays.stories)
  }

  if (request.method === 'GET' && url.pathname === `/api/content/round/${story.round_id}`) {
    roundContract.creatorContentStory.permission = {
      granted_at: approved ? '2026-01-03T00:00:00.000Z' : null,
      revoked_at: null,
      approval_requested_at: approvalRequested ? '2026-01-03T00:00:00.000Z' : null,
    }
    return send(response, 200, {
      ok: true,
      contract: roundContract,
    })
  }

  if (request.method === 'POST' && url.pathname === `/api/content/stories/${storyId}/approval-request`) {
    approvalRequested = true
    return send(response, 200, { ok: true, story_id: storyId, permission_status: 'requested' })
  }

  if (request.method === 'PATCH' && url.pathname === `/api/content/stories/${storyId}/dismissal`) {
    dismissed = true
    return send(response, 200, { ok: true, story_id: storyId })
  }

  if (request.method === 'GET' && url.pathname === '/rest/v1/creator_profiles') {
    if (failProfile) return setTimeout(() => send(response, 503, { message: 'Profile unavailable' }), delays.profile)
    const user = userFromRequest(request)
    const slugFilter = url.searchParams.get('slug')
    const statusFilter = url.searchParams.get('status')
    if (slugFilter) {
      const slug = slugFilter.replace(/^eq\./, '')
      const profile = statusFilter === 'eq.active' ? publicCreators[slug] ?? null : null
      return send(response, 200, profile)
    }
    const profile = user?.creator && creatorAllowed
      ? {
          id: '10000000-0000-4000-8000-000000000002',
          user_id: user.id,
          display_name: 'Creator Fixture',
          handle: 'creator-fixture',
          status: 'active',
          avatar_url: null,
          bio: null,
          creator_social_accounts: [],
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        }
      : null
    return setTimeout(() => send(response, 200, profile), delays.profile)
  }

  if (request.method === 'GET' && url.pathname === '/rest/v1/profiles') {
    const user = userFromRequest(request)
    return send(response, 200, {
      display_name: user?.creator ? 'Creator Fixture' : 'Player Fixture',
      avatar_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
    })
  }

  if (request.method === 'GET' && url.pathname === '/rest/v1/rounds') {
    return send(response, 200, [])
  }

  if (request.method === 'GET' && url.pathname === '/rest/v1/story_permissions') {
    if (dismissed) return send(response, 200, [])
    return send(response, 200, [{
      story_id: storyId,
      approval_requested_at: approvalRequested ? '2026-01-02T01:00:00.000Z' : null,
      granted_at: approved ? '2026-01-03T00:00:00.000Z' : null,
      story_candidates: story,
    }])
  }

  send(response, 404, { message: `Unhandled fixture route: ${request.method} ${url.pathname}` })
})

server.listen(54321, '127.0.0.1')