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

const storyId = '20000000-0000-4000-8000-000000000001'
const creatorId = '10000000-0000-4000-8000-000000000002'
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

      send(response, 200, {
        access_token: tokenFor(user),
        expires_in: 3600,
        refresh_token: `refresh-${user.id}`,
        token_type: 'bearer',
        user: userResponse(user),
      })
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/auth/v1/user') {
    const user = userFromRequest(request)
    return user
      ? send(response, 200, userResponse(user))
      : send(response, 401, { message: 'Invalid token' })
  }

  if (request.method === 'GET' && url.pathname === '/rest/v1/creator_profiles') {
    const user = userFromRequest(request)
    const profile = user?.creator
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
    return send(response, 200, profile)
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
      granted_at: approved ? '2026-01-03T00:00:00.000Z' : null,
      story_candidates: story,
    }])
  }

  send(response, 404, { message: `Unhandled fixture route: ${request.method} ${url.pathname}` })
})

server.listen(54321, '127.0.0.1')