import { expect, test } from '@playwright/test'

const endpoint = 'http://127.0.0.1:54321/api/account/delete'
const unconfirmed = /We could not confirm the account deletion outcome/
const incomplete = /Account deletion did not complete/

type Fixture = {
  cleanup?: 'normal' | 'returned' | 'thrown' | 'pending'
  navigation?: 'normal' | 'thrown' | 'rejected'
}

async function setup(page: import('@playwright/test').Page, fixture: Fixture = {}) {
  // No live fallback, including images, Auth or API requests.
  await page.context().route('**/*', async (route) => {
    const host = new URL(route.request().url()).hostname
    if (host !== 'localhost' && host !== '127.0.0.1') {
      throw new Error(`Forbidden non-fixture request to ${host}`)
    }
    await route.continue()
  })
  await page.addInitScript((options) => {
    window.deletionFixture = {
      cleanup: options.cleanup ?? 'normal',
      navigation: options.navigation ?? 'normal',
      session: true,
      cleanupCalls: 0,
    }
  }, fixture)
  await page.goto('http://localhost:3101/')
  await expect(page.getByRole('heading', { name: 'Delete Account', exact: true })).toBeVisible()
  await page.getByRole('checkbox').check()
  await page.getByLabel('Type DELETE to confirm').fill('DELETE')
}

for (const cleanup of ['normal', 'returned', 'thrown', 'pending'] as const) {
  test(`confirmed success stays successful with ${cleanup} session cleanup`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await setup(page, { cleanup })
    let requests = 0
    await page.route(endpoint, async (route) => {
      requests++
      expect(route.request().headers().authorization).toBe('Bearer isolated-fixture-token')
      expect(route.request().postDataJSON()).toEqual({ confirmation: 'DELETE' })
      await route.fulfill({
        json: { ok: true, deleted: true },
        headers: { 'access-control-allow-origin': '*' },
      })
    })
    await page.getByRole('button', { name: 'Permanently Delete Account' }).click()
    await expect(page.getByRole('heading', { name: 'Account Deleted', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Permanently Delete Account' })).toHaveCount(0)
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    if (cleanup === 'pending') {
      // Success is committed before the cleanup promise settles.
      await expect.poll(() => page.evaluate(() => typeof window.deletionFixture.releaseCleanup)).toBe('function')
      await page.evaluate(() => window.deletionFixture.releaseCleanup!())
    }
    if (cleanup === 'returned' || cleanup === 'thrown') {
      await expect(page.getByRole('status')).toContainText('Your account is deleted, but')
      await expect(page.getByRole('status')).toContainText('Do not submit another deletion request')
      await expect(page.getByText(/private .* SDK detail/)).toHaveCount(0)
    } else {
      await expect(page.getByRole('status')).toHaveCount(0)
    }
    expect(await page.evaluate(() => window.deletionFixture.cleanupCalls)).toBe(1)
    expect(await page.evaluate(() => window.deletionFixture.scope)).toBe('local')
    expect(requests).toBe(1)
    expect(errors).toEqual([])
  })
}

for (const navigation of ['thrown', 'rejected', 'normal'] as const) {
  test(`home navigation ${navigation} does not change confirmed deletion`, async ({ page }) => {
    await setup(page, { navigation })
    let requests = 0
    await page.route(endpoint, async (route) => {
      requests++
      await route.fulfill({ json: { ok: true, deleted: true }, headers: { 'access-control-allow-origin': '*' } })
    })
    await page.getByRole('button', { name: 'Permanently Delete Account' }).click()
    await expect(page.getByRole('heading', { name: 'Account Deleted', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Return to Home' }).click()
    if (navigation !== 'normal') {
      await expect(page.getByRole('status')).toContainText('Your account is still deleted')
      await expect(page.getByRole('heading', { name: 'Account Deleted', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Permanently Delete Account' })).toHaveCount(0)
      await expect(page.getByText(/private navigation detail/)).toHaveCount(0)
    } else {
      await expect(page).toHaveURL('http://localhost:3101/')
      // The fixture's home route remounts; it does not call deletion.
      await expect(page.getByRole('heading', { name: 'Delete Account', exact: true })).toBeVisible()
    }
    expect(requests).toBe(1)
  })
}

const failureCases = [
  { name: 'application cleanup failure', status: 503, body: '{"error":"fixture","stage":"application_cleanup"}', message: incomplete },
  { name: 'Auth removal failure', status: 500, body: '{"error":"fixture","stage":"auth_identity"}', message: incomplete },
  { name: 'authentication failure', status: 401, body: '{"error":"fixture","stage":"authentication"}', message: /Account deletion was not authorized/ },
  { name: 'malformed JSON', status: 200, body: 'not json', message: unconfirmed },
  { name: 'empty JSON', status: 200, body: '', message: unconfirmed },
  { name: 'missing deleted acknowledgment', status: 200, body: '{"ok":true}', message: unconfirmed },
  { name: 'contradictory success body', status: 200, body: '{"ok":true,"deleted":true,"error":"fixture"}', message: unconfirmed },
  { name: 'non-success status with success flags', status: 500, body: '{"ok":true,"deleted":true}', message: unconfirmed },
  { name: 'no-content response', status: 204, body: '', message: unconfirmed },
  { name: 'interrupted transport', status: 0, body: '', message: unconfirmed },
]

for (const fixture of failureCases) {
  test(`${fixture.name} shows no fabricated success or retry`, async ({ page }) => {
    await setup(page)
    let requests = 0
    await page.route(endpoint, async (route) => {
      requests++
      if (fixture.status === 0) {
        await route.abort('connectionreset')
      } else {
        await route.fulfill({
          status: fixture.status, body: fixture.body,
          headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
        })
      }
    })
    await page.getByRole('button', { name: 'Permanently Delete Account' }).click()
    await expect(page.getByText(fixture.message)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Account Deleted', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Permanently Delete Account' })).toBeDisabled()
    // Even a direct repeated form event cannot bypass the synchronous latch.
    await page.locator('form').evaluate((form) => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(await page.evaluate(() => window.deletionFixture.cleanupCalls)).toBe(0)
    expect(requests).toBe(1)
  })
}
