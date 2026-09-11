import { expect, test } from '@playwright/test'

test.setTimeout(90_000)

const storyId = '20000000-0000-4000-8000-000000000001'
const candidateId = '40000000-0000-4000-8000-000000000001'
const candidate = {
  id: candidateId, story_id: storyId, category: 'Round Analysis',
  title: 'The back-nine comeback', hook: 'A comeback worth sharing',
  script: 'Fixture candidate summary.', created_at: '2026-01-02T00:00:00.000Z',
}

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('creator@example.test')
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
}

test('creator story queue persists candidates, approval, and dismissal state', async ({ page }) => {
  await signIn(page)
  await page.goto('/creator')

  await expect(page.getByTestId(`card-story-${storyId}`)).toBeVisible()
  await page.getByTestId(`card-story-candidate-${candidateId}`).waitFor()
  await expect(page.getByText('Player approval required')).toBeVisible()

  await page.getByTestId(`button-request-approval-${storyId}`).click()
  await expect(page.getByText('Player approval required')).toBeVisible()
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toBeDisabled()
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toHaveText(/Approval requested/)

  await page.reload()
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toHaveText(/Approval requested/)
  await page.getByRole('button', { name: 'Sign Out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await signIn(page)
  await page.goto('/creator')
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toHaveText(/Approval requested/)

  await page.getByTestId(`button-dismiss-story-${storyId}`).click()
  await expect(page.getByTestId(`card-story-${storyId}`)).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('status-story-queue-empty')).toBeVisible()
  await page.getByRole('button', { name: 'Sign Out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await signIn(page)
  await page.goto('/creator')
  await expect(page.getByTestId('status-story-queue-empty')).toBeVisible()
})