import { expect, test } from '@playwright/test'

test('two active creators render through the shared public template', async ({ page }) => {
  await page.goto('/creators/creator-fixture')
  await expect(page.getByRole('heading', { name: 'Creator Fixture' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Get Post Round with this creator' }))
    .toHaveAttribute('href', '/r/creator-fixture')
  await expect(page.getByRole('link', { name: /creatorfixture/i })).toHaveAttribute(
    'href',
    'https://instagram.com/creatorfixture',
  )
  await expect(page).toHaveTitle('Creator Fixture | Post Round')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Creator Fixture | Post Round',
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://images.example.test/creator-fixture.jpg',
  )

  await page.goto('/creators/second-creator')
  await expect(page.getByRole('heading', { name: 'Second Creator' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Get Post Round with this creator' }))
    .toHaveAttribute('href', '/r/second-creator')
  await expect(page.getByText('No social accounts linked yet.')).toBeVisible()
  await expect(page.getByText('S', { exact: true })).toBeVisible()
  await expect(page).toHaveTitle('Second Creator | Post Round')
})

test('referral route rejects unknown, inactive and malformed creators', async ({ request }) => {
  for (const slug of ['missing-creator', 'inactive-creator', 'INVALID_SLUG']) {
    const response = await request.get(`/r/${slug}`, { maxRedirects: 0 })
    expect(response.status()).toBe(404)
  }
})

test('active creator referral records a click and redirects with a pending cookie', async ({ request }) => {
  const response = await request.get('/r/creator-fixture', {
    headers: { 'user-agent': 'Desktop browser' },
    maxRedirects: 0,
  })
  expect(response.status()).toBe(302)
  expect(response.headers().location).toMatch(/\/signup$/)
  expect(response.headers()['set-cookie']).toContain('pr_ref=')
  expect(response.headers()['cache-control']).toBe('no-store')
  const other = await request.get('/r/second-creator', { maxRedirects: 0 })
  expect(other.status()).toBe(302)
  // The HTTP test fixture cannot resend production Secure cookies; both
  // creators must still create distinct anonymous click evidence.
  expect(other.headers()['set-cookie']).not.toBe(response.headers()['set-cookie'])
})

test('pending web referral survives login and is claimed on the server', async ({ page }) => {
  await page.goto('/r/creator-fixture')
  await expect(page).toHaveURL(/\/signup$/)
  await page.goto('/login')
  await page.getByLabel('Email address').fill('player@example.test')
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
  const cookies = await page.context().cookies()
  expect(cookies.some((cookie) => cookie.name === 'pr_ref')).toBe(false)
})

test('missing, inactive, and malformed creator slugs return 404', async ({ request }) => {
  for (const slug of ['missing-creator', 'inactive-creator', 'INVALID_SLUG']) {
    const response = await request.get(`/creators/${slug}`)
    expect(response.status()).toBe(404)
  }
})