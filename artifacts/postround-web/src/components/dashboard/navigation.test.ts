import assert from 'node:assert/strict'
import test from 'node:test'
import { getDashboardNavItems } from './navigation.ts'

test('ordinary players never receive creator navigation', () => {
  const items = getDashboardNavItems(false)

  assert.equal(items.some((item) => item.href === '/creator'), false)
  assert.deepEqual(items.map(({ label }) => label), [
    'Dashboard', 'Profile', 'Settings',
  ])
})

test('Player DNA has no player or creator navigation entry point', () => {
  for (const hasCreatorProfile of [false, true]) {
    const items = getDashboardNavItems(hasCreatorProfile)
    assert.equal(items.some(({ href, label }) => /player.?dna/i.test(`${href} ${label}`)), false)
  }
})

test('active creators receive only creator-relevant navigation', () => {
  const items = getDashboardNavItems(true)
  assert.deepEqual(
    items.map(({ href, label }) => ({ href, label })),
    [
      { href: '/dashboard', label: 'Creator Dashboard' },
      { href: '/creator', label: 'Creator Studio' },
      { href: '/dashboard/profile', label: 'Profile' },
      { href: '/dashboard/settings', label: 'Settings' },
    ],
  )
})