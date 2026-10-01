import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('public feature entry points are removed without deleting the marketing section', () => {
  const home = source('./page.tsx')
  const footer = source('../components/Footer.tsx')
  assert.doesNotMatch(home, /\['Player DNA', '#player-dna'\]/)
  assert.match(home, /\{false && \(<div id="player-dna"/)
  for (const copy of ['A living picture of your game.', 'Patterns across rounds', 'Scoring context', 'Mental tendencies']) {
    assert.ok(home.includes(copy))
  }
  assert.doesNotMatch(footer, /player-dna|Player DNA/)
  assert.match(home, /alt="An abstract golf-inspired learning pattern"/)
  assert.ok(existsSync(new URL('../../public/player-dna-visual.jpg', import.meta.url)))
  assert.match(source('./privacy/page.tsx'), /Player DNA/)
})

test('the dashboard and shared desktop/mobile navigation do not expose Player DNA', () => {
  assert.doesNotMatch(source('./(dashboard)/dashboard/page.tsx'), /player.?dna/i)
  assert.doesNotMatch(source('../components/dashboard/navigation.ts'), /player.?dna/i)
  const shell = source('../components/dashboard/DashboardShell.tsx')
  assert.match(shell, /getDashboardNavItems\(hasCreatorProfile\)/)
  assert.equal((shell.match(/<Sidebar/g) ?? []).length, 2)
})

test('server guard checks authentication before redirecting and never renders children', () => {
  const guard = source('./(dashboard)/dashboard/player-dna/visibility.ts')
  assert.match(guard, /if \(!process\.env\.NEXT_PUBLIC_SUPABASE_URL \|\| !process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY\) \{\s*redirect\('\/login'\)/)
  assert.match(guard, /supabase\.auth\.getUser\(\)/)
  assert.match(guard, /if \(!user\) redirect\('\/login'\)/)
  assert.ok(guard.indexOf("if (!user)") < guard.indexOf("redirect('/dashboard')"))
  assert.doesNotMatch(guard, /return|<.*children/)
  const page = source('./(dashboard)/dashboard/player-dna/page.tsx')
  assert.ok(page.indexOf('await hidePlayerDNAOnWeb()') < page.indexOf('return ('))
})

test('original Player DNA page and authenticated API implementation remain available', () => {
  const page = source('./(dashboard)/dashboard/player-dna/page.tsx')
  assert.match(page, /export default async function PlayerDNAPage/)
  assert.match(page, /Your Player DNA/)
  assert.match(page, /Building your DNA/)
  const api = source('./api/player-dna/route.ts')
  assert.match(api, /export async function GET/)
  assert.match(api, /supabase\.auth\.getUser\(\)/)
  assert.match(api, /userId: user\.id/)
})