import { expect, test } from '@playwright/test'

test('two active creators render through the shared public template', async ({ page }) => {
  await page.goto('/creators/creator-fixture')
  await expect(page.getByRole('heading', { name: 'Creator Fixture' })).toBeVisible()
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
  await expect(page.getByText('No social accounts linked yet.')).toBeVisible()
  await expect(page.getByText('S', { exact: true })).toBeVisible()
  await expect(page).toHaveTitle('Second Creator | Post Round')
})

test('missing, inactive, and malformed creator slugs return 404', async ({ request }) => {
  for (const slug of ['missing-creator', 'inactive-creator', 'INVALID_SLUG']) {
    const response = await request.get(`/creators/${slug}`)
    expect(response.status()).toBe(404)
  }
})