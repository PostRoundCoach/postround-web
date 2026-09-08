import assert from 'node:assert/strict'
import test from 'node:test'
import { getDashboardNavItems } from './navigation.ts'

test('ordinary players never receive creator navigation', () => {
  const items = getDashboardNavItems(false)

  assert.equal(items.some((item) => item.href === '/creator'), false)
})

test('active creators receive a profile-adjacent link to Creator Studio', () => {
  const items = getDashboardNavItems(true)
  const profileIndex = items.findIndex((item) => item.href === '/dashboard/profile')

  assert.deepEqual(
    items.slice(profileIndex, profileIndex + 2).map(({ href, label }) => ({ href, label })),
    [
      { href: '/dashboard/profile', label: 'Profile' },
      { href: '/creator', label: 'Creator Dashboard' },
    ],
  )
})