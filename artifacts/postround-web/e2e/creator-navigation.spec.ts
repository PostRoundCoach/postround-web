import { expect, test, type Page } from '@playwright/test'

test.setTimeout(90_000)

const password = 'fixture-password'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 })
}

async function openMobileMenu(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation menu' }).click()
}

test('ordinary players cannot see or open Creator Studio', async ({ page }) => {
  await signIn(page, 'player@example.test')

  await expect(page.getByRole('link', { name: 'Creator Studio' })).toHaveCount(0)
  await expect(page.getByText('Subscription')).toBeVisible()
  await expect(page.getByText('Recent Rounds')).toBeVisible()
  await openMobileMenu(page)
  await expect(page.getByRole('link', { name: 'Creator Studio' })).toHaveCount(0)

  await page.goto('/creator')
  await expect(page).toHaveURL(/\/dashboard\/profile$/)
})

test('active creators can navigate to Creator Studio on desktop', async ({ page }) => {
  await signIn(page, 'creator@example.test')

  await expect(page.getByRole('heading', { name: 'Creator Dashboard' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Creator Studio' })).toBeVisible()
  for (const label of ['Recent Rounds', 'Player DNA', 'AI Coaching Reports', 'Subscription', 'Upgrade Plan']) {
    await expect(page.getByText(label, { exact: true })).toHaveCount(0)
  }
  for (const label of ['My Rounds', 'Coaching Reports', 'Billing']) {
    await expect(page.getByRole('link', { name: label })).toHaveCount(0)
  }
  await page.getByRole('link', { name: 'Creator Studio', exact: true }).click()
  await expect(page).toHaveURL(/\/creator$/, { timeout: 30_000 })
  await expect(page.getByText('Creator Studio', { exact: true })).toBeVisible()

  await page.getByTestId('link-back-dashboard').click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('active creators can navigate to Creator Studio and back on mobile', async ({ page }) => {
  await signIn(page, 'creator@example.test')
  await openMobileMenu(page)

  for (const label of ['My Rounds', 'Coaching Reports', 'Player DNA', 'Billing']) {
    await expect(page.getByRole('link', { name: label })).toHaveCount(0)
  }
  await page.getByRole('link', { name: 'Creator Studio', exact: true }).click()
  await expect(page).toHaveURL(/\/creator$/, { timeout: 30_000 })
  await expect(page.getByTestId('link-back-dashboard')).toBeVisible()

  await page.getByTestId('link-back-dashboard').click()
  await expect(page).toHaveURL(/\/dashboard$/)
})