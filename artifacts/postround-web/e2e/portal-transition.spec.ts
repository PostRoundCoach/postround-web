import { expect, test, type Page } from '@playwright/test'

test.setTimeout(90_000)

async function configure(page: Page, config: object = {}) {
  await page.request.post('http://127.0.0.1:54321/__test/config', { data: config })
}

async function fillLogin(page: Page, email = 'creator@example.test') {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
}

async function signIn(page: Page) {
  await fillLogin(page)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByRole('heading', { name: 'Creator Dashboard' })).toBeVisible()
}

test.beforeEach(async ({ page }) => configure(page))

test('quick sign-in does not show overlay and slow sign-in keeps it through handoff', async ({ page }) => {
  await signIn(page)
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
  await configure(page, { delays: { login: 800 } })
  await page.context().clearCookies()
  await fillLogin(page)
  const button = page.getByRole('button', { name: /Signing in/ })
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(button).toBeDisabled()
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
  await expect(page.getByTestId('portal-transition-loading')).toBeVisible()
  await expect(page.locator('[data-portal-snapshot]')).toContainText('Welcome back')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Creator Dashboard' })).toBeVisible()
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
})

test('failed and exceptional sign-in unlocks the form and removes overlay', async ({ page }) => {
  await configure(page, { delays: { login: 650 }, failLogin: true })
  await fillLogin(page)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByTestId('portal-transition-loading')).toBeVisible()
  await expect(page.locator('[data-portal-snapshot]')).toContainText('Welcome back')
  await expect(page.getByText('We couldn’t sign you in. Please try again.')).toBeVisible()
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled()
  await configure(page)
  await page.route('**/auth/v1/token?grant_type=password', route => route.abort())
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText('We couldn’t sign you in. Please try again.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled()
})

test('sidebar, tile, mobile, and return link show feedback without waiting for stories', async ({ page }) => {
  await signIn(page)
  await configure(page, { delays: { profile: 850, stories: 4500 } })
  const sidebar = page.getByRole('link', { name: 'Creator Studio', exact: true })
  // Both clicks happen in the same tick, before React can render the overlay.
  await sidebar.evaluate((link: HTMLAnchorElement) => { link.click(); link.click() })
  await expect(page.getByRole('heading', { name: 'Creator Dashboard' })).toBeVisible()
  await expect(page.getByTestId('portal-transition-loading')).toBeVisible()
  await expect(page.locator('[data-portal-snapshot]')).toContainText('Creator Dashboard')
  await expect(page.getByTestId('link-back-dashboard')).toBeVisible()
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
  await expect(page.getByTestId('status-creator-loading')).toBeVisible()

  await page.getByTestId('link-back-dashboard').click()
  await expect(page.getByRole('heading', { name: 'Creator Dashboard' })).toBeVisible()
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
  await page.getByRole('link', { name: 'Open Creator Studio' }).click()
  await expect(page.getByTestId('link-back-dashboard')).toBeVisible()
  await page.getByTestId('link-back-dashboard').click()
  await expect(page.getByRole('heading', { name: 'Creator Dashboard' })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await page.getByRole('link', { name: 'Creator Studio', exact: true }).click()
  await expect(page.getByTestId('link-back-dashboard')).toBeVisible()
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('link-back-dashboard')).toBeVisible()
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Creator Dashboard' })).toBeVisible()
})

test('a Studio redirect releases the transition lock', async ({ page }) => {
  await signIn(page)
  await configure(page, { creatorAllowed: false, delays: { profile: 650 } })
  await page.getByRole('link', { name: 'Creator Studio', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/profile$/)
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
})

test('a destination error clears the overlay and offers retry', async ({ page }) => {
  await signIn(page)
  await configure(page, { failProfile: true, delays: { profile: 650 } })
  await page.getByRole('link', { name: 'Creator Studio', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'We couldn’t load Creator Studio' })).toBeVisible({ timeout: 25_000 })
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
  await configure(page)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByTestId('link-back-dashboard')).toBeVisible()
})

test('unauthorized direct Studio request redirects and leaves no overlay', async ({ page }) => {
  await fillLogin(page, 'player@example.test')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText('Recent Rounds')).toBeVisible()
  await page.goto('/creator')
  await expect(page).toHaveURL(/\/dashboard\/profile$/)
  await expect(page.getByTestId('portal-transition-loading')).toHaveCount(0)
})