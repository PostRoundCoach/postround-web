import { expect, test } from '@playwright/test'

test('public desktop, mobile and footer hide Player DNA but retain adjacent features', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#player-dna')).toHaveCount(0)
  await expect(page.getByText(/Player DNA|A living picture of your game|Patterns across rounds|Scoring context|Mental tendencies/)).toHaveCount(0)
  await expect(page.locator('a[href*="player-dna"]')).toHaveCount(0)
  for (const label of ['AI Coaching', 'Share Your Round', 'Creators', 'Support']) {
    await expect(page.locator('nav').getByRole('link', { name: label, exact: true })).toBeVisible()
  }
  await expect(page.locator('footer').getByRole('link', { name: 'AI Coaching' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Join the Launch Waitlist' }).first()).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  for (const label of ['AI Coaching', 'Share Your Round', 'Creators', 'Support']) {
    await expect(page.locator('nav').getByRole('link', { name: label, exact: true }).last()).toBeVisible()
  }
  await expect(page.locator('a[href*="player-dna"]')).toHaveCount(0)
})

test('players see no dashboard entry points and direct requests and refreshes redirect', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('player@example.test')
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 })
  await expect(page.getByText('Player DNA')).toHaveCount(0)
  await expect(page.locator('a[href*="player-dna"]')).toHaveCount(0)
  await expect(page.getByText('Recent Rounds', { exact: true })).toBeVisible()
  await expect(page.getByText('Player Profile', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Profile', exact: true })).toBeVisible()
  await expect(page.getByText('Player DNA')).toHaveCount(0)

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto('/dashboard/player-dna')
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText('Player DNA')).toHaveCount(0)
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard$/)
  }

  // App Router client navigation requests use the RSC protocol, not document HTML.
  const response = await page.request.get('/dashboard/player-dna', {
    headers: { RSC: '1' },
    maxRedirects: 0,
  })
  const body = await response.text()
  expect(`${response.headers().location ?? ''} ${body}`).toContain('/dashboard')
  expect(body).not.toContain('Building your DNA')
  expect(body).not.toContain('Your Player DNA')
})

test('signed-out direct URL requests and refreshes keep login protection', async ({ page }) => {
  await page.goto('/dashboard/player-dna')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByText('Player DNA')).toHaveCount(0)
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
  const response = await page.request.get('/dashboard/player-dna', { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(response.headers().location).toMatch(/\/login$/)
})