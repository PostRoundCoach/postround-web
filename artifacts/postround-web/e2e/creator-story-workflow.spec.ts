import { expect, test } from '@playwright/test'

test.setTimeout(90_000)

const storyId = '20000000-0000-4000-8000-000000000001'
const secondStoryId = '20000000-0000-4000-8000-000000000002'
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

test('content loads automatically, shows retrieval failure, then retries', async ({ page }) => {
  let attempts = 0
  await page.route(`**/api/content/round/${roundId}`, async (route) => {
    attempts += 1
    if (attempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.fulfill({ status: 503, json: { message: 'Fixture retrieval failure' } })
    } else {
      await route.continue()
    }
  })
  await signIn(page)
  await page.goto('/creator')
  await expect(page.getByTestId(`status-ideas-loading-${storyId}`)).toBeVisible()
  await expect(page.getByTestId(`status-ideas-error-${storyId}`)).toBeVisible()
  expect(attempts).toBe(1)
  await page.getByTestId(`button-retry-ideas-${storyId}`).click()
  await expect(page.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  expect(attempts).toBe(2)
})

test('stories and their angles are visible on load and refresh without extra retrievals', async ({ page }) => {
  let roundRequests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === `/api/content/round/${roundId}`) roundRequests += 1
  })
  await page.route('**/api/content/stories', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.stories.push({
      ...body.stories[0],
      id: secondStoryId,
      story_id: secondStoryId,
      headline: 'Another shared round',
      summary: 'A second fixture story.',
    })
    await route.fulfill({ response, json: body })
  })
  await signIn(page)
  await page.goto('/creator')
  const first = page.getByTestId(`card-story-${storyId}`)
  const second = page.getByTestId(`card-story-${secondStoryId}`)
  await expect(first.getByTestId(`text-story-headline-${storyId}`)).toBeVisible()
  await expect(second.getByTestId(`text-story-headline-${secondStoryId}`)).toBeVisible()
  await expect(first.getByText('Supporting details')).toBeVisible()
  await expect(first.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  await expect(second.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  await expect(first.getByTestId(`badge-story-candidate-archetype-${candidateId}`)).toHaveText('Round Analysis')
  await expect(first.getByTestId(`card-story-candidate-${candidateId}`)).toContainText('Fixture candidate summary.')
  await expect(first.getByText('Ready-to-use script')).toHaveCount(0)
  await expect(first.getByRole('button', { name: 'Round Analysis' })).toHaveCount(0)
  await expect(first.getByTestId(`card-story-candidate-${candidateId}`).locator('details, summary, button')).toHaveCount(1) // Only Copy is interactive.
  await expect.poll(() => roundRequests).toBe(2)

  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(second.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
    await expect(second.getByTestId(`button-copy-story-${candidateId}`)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }
  await page.reload()
  await expect(first.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  await expect(second.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  await expect.poll(() => roundRequests).toBe(4)
})

test('Story and Reflection copy only displayed content and report clipboard failures', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { __copied: string[]; __copyFail: boolean }
    state.__copied = []
    state.__copyFail = false
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          if (state.__copyFail) throw new Error('Clipboard unavailable')
          state.__copied.push(text)
        },
      },
    })
  })
  let reflectionFallback = false
  await page.route(`**/api/content/round/${roundId}`, async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.contract.creatorContentStory.contentIdea.story_angle = 'Patience at the turn'
    if (reflectionFallback) {
      body.contract.coachingReflection.content.reflection = null
      body.contract.coachingReflection.content.script = 'Fallback reflection script.'
    }
    await route.fulfill({ response, json: body })
  })
  await signIn(page)
  await page.goto('/creator')
  const storyPanel = page.getByTestId(`card-story-candidate-${candidateId}`)
  const reflectionPanel = page.getByTestId(`section-coaching-reflection-${storyId}`)
  await expect(storyPanel).toContainText('Patience at the turn')
  await expect(storyPanel.getByRole('button', { name: 'Patience at the turn' })).toHaveCount(0)
  await expect(storyPanel.getByRole('button', { name: 'Copy Creator Story' })).toBeVisible()
  await expect(reflectionPanel.getByRole('button', { name: 'Copy Coaching Reflection' })).toBeVisible()
  await page.getByTestId(`button-copy-story-${candidateId}`).click()
  await expect(page.getByText('Creator Story copied to clipboard')).toBeVisible()
  await page.getByTestId(`button-copy-reflection-${storyId}`).click()
  await expect(page.getByText('Coaching Reflection copied to clipboard')).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & { __copied: string[] }).__copied)).toEqual([
    'Round Analysis\n\nPatience at the turn\n\nThe back-nine comeback\n\nA comeback worth sharing\n\nFixture candidate summary.',
    'Patience changed the back nine\n\nThe response after the turn mattered most.\n\nThe round stabilized when the player stayed patient.',
  ])

  await page.evaluate(() => { (window as typeof window & { __copyFail: boolean }).__copyFail = true })
  await page.getByTestId(`button-copy-story-${candidateId}`).click()
  await expect(page.getByText('Failed to copy — clipboard access denied')).toBeVisible()
  await page.getByTestId(`button-copy-reflection-${storyId}`).click()
  await expect(page.getByText('Failed to copy — clipboard access denied')).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & { __copied: string[] }).__copied)).toHaveLength(2)

  reflectionFallback = true
  await page.reload()
  await expect(reflectionPanel).toContainText('Fallback reflection script.')
  await page.getByTestId(`button-copy-reflection-${storyId}`).click()
  expect(await page.evaluate(() => (window as typeof window & { __copied: string[] }).__copied)).toEqual([
    'Patience changed the back nine\n\nThe response after the turn mattered most.\n\nFallback reflection script.',
  ])
})

test('unavailable or empty content never offers a misleading Copy action', async ({ page }) => {
  await page.route(`**/api/content/round/${roundId}`, async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.contract.creatorContentStory.contentIdea = null
    body.contract.coachingReflection.content.title = ''
    body.contract.coachingReflection.content.hook = ''
    body.contract.coachingReflection.content.reflection = null
    body.contract.coachingReflection.content.script = null
    await route.fulfill({ response, json: body })
  })
  await signIn(page)
  await page.goto('/creator')
  await expect(page.getByTestId(`status-candidates-empty-${storyId}`)).toBeVisible()
  await expect(page.getByTestId(`button-copy-story-${candidateId}`)).toHaveCount(0)
  await expect(page.getByTestId(`button-copy-reflection-${storyId}`)).toHaveCount(0)
})

test('available content refresh is read-only, in place, guarded, and recoverable', async ({ page }) => {
  await signIn(page)
  await page.goto('/creator')
  const first = page.getByTestId(`card-story-${storyId}`)
  await expect(first).toBeVisible()
  await expect(first.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()

  let requests = 0
  let releaseFirst: (() => void) | undefined
  const firstPending = new Promise<void>((resolve) => { releaseFirst = resolve })
  const contentRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/content/')) {
      contentRequests.push(`${request.method()} ${new URL(request.url()).pathname}`)
    }
  })
  await page.route('**/api/content/stories', async (route) => {
    requests += 1
    if (requests === 2) {
      await route.fulfill({ status: 503, json: { message: 'Please retry' } })
      return
    }
    if (requests === 1) await firstPending
    const response = await route.fetch()
    const body = await response.json()
    body.stories.push({
      ...body.stories[0],
      id: secondStoryId,
      story_id: secondStoryId,
      headline: 'Newly shared round',
    })
    await route.fulfill({ response, json: body })
  })

  const refresh = page.getByTestId('button-refresh-available-content')
  await expect(refresh).toBeVisible()
  await refresh.click()
  await expect(refresh).toBeDisabled()
  await expect(refresh).toHaveAttribute('aria-busy', 'true')
  await expect(first).toBeVisible()
  expect(requests).toBe(1)
  releaseFirst?.()
  await expect(page.getByTestId(`card-story-${secondStoryId}`)).toBeVisible()
  await expect(refresh).toBeEnabled()
  await expect(first.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()

  await refresh.click()
  await expect(page.getByTestId('status-refresh-stories-error')).toBeVisible()
  await expect(first).toBeVisible()
  await expect(page.getByTestId(`card-story-${secondStoryId}`)).toBeVisible()
  await refresh.click()
  await expect(page.getByTestId('status-refresh-stories-error')).toHaveCount(0)
  await expect(page.getByTestId(`card-story-${secondStoryId}`)).toBeVisible()
  expect(requests).toBe(3)
  expect(contentRequests.filter((request) => request === 'GET /api/content/stories')).toHaveLength(3)
  expect(contentRequests.every((request) => request.startsWith('GET '))).toBe(true)
})

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
  await page.getByTestId(`card-story-candidate-${candidateId}`).waitFor({ state: 'attached' })
  await expect(page.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  expect(contentRequests).toContainEqual({ method: 'GET', pathname: '/api/content/stories' })
  expect(contentRequests).toContainEqual({
    method: 'GET',
    pathname: `/api/content/round/${roundId}`,
  })
  expect(contentRequests).not.toContainEqual({ method: 'GET', pathname: '/api/content/ideas' })
  expect(contentRequests).not.toContainEqual({ method: 'POST', pathname: '/api/content/generate' })
  expect(contentRequests.every(({ pathname }) => !pathname.includes('player_stories'))).toBe(true)
  await expect(page.getByText('Player approval required')).toBeVisible()
  await page.getByTestId('scorecard-full-details').getByText('View full round details').click()
  await expect(page.getByTestId('scorecard-metadata')).toContainText('Fixture Golfer')
  await expect(page.getByTestId('scorecard-full-details')).toContainText('Front 9: 45')
  await expect(page.getByTestId('scorecard-full-details')).toContainText('Back 9: 40')
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
    `card-story-candidate-${candidateId}`,
    `section-coaching-reflection-${storyId}`,
    'scorecard-metadata',
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
  await expect(page.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
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
  await expect(page.getByTestId('scorecard-total-score')).toBeVisible()
  await expect(page.getByTestId(`section-coaching-reflection-${storyId}`)).toBeVisible()
  await expect(page.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()

  await page.unroute(`**/api/content/round/${roundId}`)
   await page.getByRole('link', { name: 'Back to Dashboard' }).click()
  await signOut(page)
  await signIn(page)
  await page.goto('/creator')
  await expect(page.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toHaveText(/Approval requested/)

  await page.getByTestId(`button-dismiss-story-${storyId}`).click()
  await expect(page.getByTestId(`card-story-${storyId}`)).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('status-story-queue-empty')).toBeVisible()
   await page.getByRole('link', { name: 'Back to Dashboard' }).click()
  await signOut(page)
  await signIn(page)
  await page.goto('/creator')
  await expect(page.getByTestId('status-story-queue-empty')).toBeVisible()
})