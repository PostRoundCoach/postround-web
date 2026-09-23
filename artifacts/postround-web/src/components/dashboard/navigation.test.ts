import assert from 'node:assert/strict'
import test from 'node:test'
import { getDashboardNavItems } from './navigation.ts'

test('ordinary players never receive creator navigation', () => {
  const items = getDashboardNavItems(false)

  assert.equal(items.some((item) => item.href === '/creator'), false)
  assert.deepEqual(items.map(({ label }) => label), [
    'Dashboard', 'My Rounds', 'Coaching Reports', 'Player DNA', 'Profile', 'Billing', 'Settings',
  ])
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