import { expect, test } from '@playwright/test'

test.setTimeout(90_000)

const storyId = '20000000-0000-4000-8000-000000000001'
const roundId = '30000000-0000-4000-8000-000000000001'
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

async function signOut(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Open navigation menu' }).click()
  await page.getByRole('button', { name: 'Sign Out' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

test('creator story queue persists candidates, approval, and dismissal state', async ({ page }) => {
  const contentRequests: Array<{ method: string; pathname: string }> = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/content/')) {
      contentRequests.push({ method: request.method(), pathname: url.pathname })
    }
  })

  await signIn(page)
  await page.goto('/creator')

  await expect(page.getByTestId(`card-story-${storyId}`)).toBeVisible()
  await page.getByTestId(`card-story-candidate-${candidateId}`).waitFor()
  expect(contentRequests).toContainEqual({ method: 'GET', pathname: '/api/content/stories' })
  expect(contentRequests).toContainEqual({
    method: 'GET',
    pathname: `/api/content/round/${roundId}`,
  })
  expect(contentRequests).not.toContainEqual({ method: 'GET', pathname: '/api/content/ideas' })
  expect(contentRequests).not.toContainEqual({ method: 'POST', pathname: '/api/content/generate' })
  expect(contentRequests.every(({ pathname }) => !pathname.includes('player_stories'))).toBe(true)
  await expect(page.getByText('Player approval required')).toBeVisible()
  await page.getByTestId(`card-story-candidate-${candidateId}`).getByText('View full details and context').click()
  await expect(page.getByTestId('scorecard-player-name')).toHaveText(/Fixture Golfer/)
  await expect(page.getByTestId('scorecard-front-9')).toHaveText('45')
  await expect(page.getByTestId('scorecard-back-9')).toHaveText('40')
  await expect(page.getByTestId('scorecard-hole-note-1')).toHaveText(
    /Stayed patient after the approach finished short/,
  )
  await expect(page.getByTestId(`section-coaching-reflection-${storyId}`)).toContainText(
    'The round stabilized when the player stayed patient.',
  )
  const dashboardSections = await page.locator(
    `[data-testid="scorecard-metadata"], [data-testid="section-coaching-reflection-${storyId}"], [data-testid="card-story-candidate-${candidateId}"], [data-testid="section-share-scorecard-${storyId}"]`,
  ).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-testid')))
  expect(dashboardSections).toEqual([
    'scorecard-metadata',
    `section-coaching-reflection-${storyId}`,
    `card-story-candidate-${candidateId}`,
    `section-share-scorecard-${storyId}`,
  ])
  await expect(page.getByTestId(`preview-share-scorecard-${storyId}`)).toContainText('Fixture Golf Club')
  await expect(page.getByTestId(`preview-share-scorecard-${storyId}`)).toContainText('85')
  await expect(page.getByTestId(`button-download-scorecard-${storyId}`)).toBeDisabled()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByTestId('scorecard-hole-1')).toBeVisible()
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)

  await page.getByTestId(`button-request-approval-${storyId}`).click()
  await expect(page.getByText('Player approval required')).toBeVisible()
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toBeDisabled()
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toHaveText(/Approval requested/)

  await page.route(`**/api/content/round/${roundId}`, async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.contract.creatorContentStory.permission.granted_at = '2026-01-03T00:00:00.000Z'
    await route.fulfill({ response, json: body })
  })
  await page.reload()
  const downloadButton = page.getByTestId(`button-download-scorecard-${storyId}`)
  await expect(downloadButton).toBeEnabled()
  const downloadPromise = page.waitForEvent('download')
  await downloadButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('fixture-golf-club-scorecard.png')

  await page.evaluate(() => {
    HTMLCanvasElement.prototype.getContext = () => null
  })
  await downloadButton.click()
  await expect(page.getByTestId(`status-scorecard-download-error-${storyId}`)).toBeVisible()
  await expect(page.getByTestId('scorecard-metadata')).toBeVisible()
  await expect(page.getByTestId(`section-coaching-reflection-${storyId}`)).toBeVisible()
  await expect(page.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()

  await page.unroute(`**/api/content/round/${roundId}`)
  await page.getByRole('link', { name: 'Back to Profile' }).click()
  await signOut(page)
  await signIn(page)
  await page.goto('/creator')
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toHaveText(/Approval requested/)

  await page.getByTestId(`button-dismiss-story-${storyId}`).click()
  await expect(page.getByTestId(`card-story-${storyId}`)).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('status-story-queue-empty')).toBeVisible()
  await page.getByRole('link', { name: 'Back to Profile' }).click()
  await signOut(page)
  await signIn(page)
  await page.goto('/creator')
  await expect(page.getByTestId('status-story-queue-empty')).toBeVisible()
})