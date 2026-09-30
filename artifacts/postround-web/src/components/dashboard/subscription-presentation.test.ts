import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { presentSubscription } from '../../lib/subscription/presentation.ts'

const record = (subscription_plan: string | null, subscription_status: string | null, report_credits_remaining: number | null = null) =>
  ({ subscription_plan, subscription_status, report_credits_remaining })

test('paid access requires an active or trialing known plan', () => {
  for (const status of ['active', 'trialing']) {
    const paid = presentSubscription(record('player', status, 8))
    assert.equal(paid.subscribed, true)
    assert.equal(paid.status, status)
    assert.match(paid.access, /Subscribed access/)
    assert.doesNotMatch(paid.reportBalance, /8/)
  }
  for (const status of ['past_due', 'canceled', 'unpaid', 'incomplete']) {
    const paid = presentSubscription(record('performance', status, 8))
    assert.equal(paid.subscribed, false)
    assert.equal(paid.status, status)
    assert.equal(paid.access, 'Paid access not active')
    assert.match(paid.reportBalance, /unavailable/)
  }
})

test('missing and unfamiliar values do not become Free or acquire a synthetic balance', () => {
  assert.equal(presentSubscription(null).plan, 'Plan unavailable')
  assert.equal(presentSubscription(record(null, null)).status, 'Status unavailable')
  assert.match(presentSubscription(record('pro', 'active', 10)).access, /unrecognized/)
  assert.equal(presentSubscription(record('player', null)).subscribed, false)
  assert.match(presentSubscription(record('player', null)).access, /unavailable/)
})

test('Free report balance is read as stored, including older balances, never inferred', () => {
  assert.equal(presentSubscription(record('free', 'active', 12)).reportBalance, '12 AI Round Reports remaining')
  assert.equal(presentSubscription(record('free', 'active', 0)).reportBalance, '0 AI Round Reports remaining')
  assert.match(presentSubscription(record('free', 'active')).reportBalance, /unavailable/)
  assert.match(presentSubscription(record('free', 'active', -1)).reportBalance, /unavailable/)
})

test('billing stays available directly while the dashboard has no subscription entry point', () => {
  const billing = readFileSync(new URL('../../app/(dashboard)/dashboard/billing/page.tsx', import.meta.url), 'utf8')
  const dashboard = readFileSync(new URL('../../app/(dashboard)/dashboard/page.tsx', import.meta.url), 'utf8')
  assert.match(billing, /getPlayerSubscription\(user.id\)/)
  assert.doesNotMatch(dashboard, /getPlayerSubscription|presentSubscription|href="\/dashboard\/billing"|Subscription Status Card/)
  assert.doesNotMatch(billing, /\$19|\$49|Unlimited round reviews|Free Plan|3 round reviews per month|Manage your payment methods/)
  assert.match(billing, /Live price and currency unavailable/)
  assert.match(billing, /Included PR Credits remaining: unavailable/)
  assert.match(billing, /Purchased PR Credits remaining: unavailable/)
  assert.match(billing, /disabled/)
  const shell = readFileSync(new URL('./DashboardShell.tsx', import.meta.url), 'utf8')
  assert.equal((shell.match(/<Sidebar/g) ?? []).length, 2)
  assert.match(shell, /getDashboardNavItems\(hasCreatorProfile\)/)
  assert.match(shell, /isAdmin &&/)
})