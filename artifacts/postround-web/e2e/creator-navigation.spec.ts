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

  await expect(page.getByRole('link', { name: 'Creator Dashboard' })).toHaveCount(0)
  await openMobileMenu(page)
  await expect(page.getByRole('link', { name: 'Creator Dashboard' })).toHaveCount(0)

  await page.goto('/creator')
  await expect(page).toHaveURL(/\/dashboard\/profile$/)
})

test('active creators can navigate to Creator Studio on desktop', async ({ page }) => {
  await signIn(page, 'creator@example.test')

  await page.getByRole('link', { name: 'Creator Dashboard' }).click()
  await expect(page).toHaveURL(/\/creator$/, { timeout: 30_000 })
  await expect(page.getByText('Creator Studio', { exact: true })).toBeVisible()

  await page.getByTestId('link-back-profile').click()
  await expect(page).toHaveURL(/\/dashboard\/profile$/)
})

test('active creators can navigate to Creator Studio and back on mobile', async ({ page }) => {
  await signIn(page, 'creator@example.test')
  await openMobileMenu(page)

  await page.getByRole('link', { name: 'Creator Dashboard' }).click()
  await expect(page).toHaveURL(/\/creator$/, { timeout: 30_000 })
  await expect(page.getByTestId('link-back-profile')).toBeVisible()

  await page.getByTestId('link-back-profile').click()
  await expect(page).toHaveURL(/\/dashboard\/profile$/)
})