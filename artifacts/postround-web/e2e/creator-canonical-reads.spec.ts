import { expect, test, type Page } from '@playwright/test'

const fixture = 'http://127.0.0.1:54321'
const storyId = '20000000-0000-4000-8000-000000000001'
const roundId = '30000000-0000-4000-8000-000000000001'
const creator = { id: '10000000-0000-4000-8000-000000000002', name: 'API Creator', capabilities: { advancedCreator: false, creatorVoice: false } }
const story = {
  id: storyId, round_id: roundId, story_type: 'open_future_type',
  headline: 'Hit every fairway — 6 of 6', summary: 'Synthetic authorized candidate summary.',
  status: 'shared', created_at: '2020-01-01T00:00:00Z',
}
async function login(page: Page, email = 'creator@example.test') {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
}
test.beforeEach(async ({ request }) => {
  await request.post(`${fixture}/__test/config`, { data: {} })
})

test('minimal Shared candidate stays independent of generated draft and unknown approval', async ({ page }) => {
  let details = 0
  const requests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/content/')) requests.push(`${r.method()} ${new URL(r.url()).pathname}`)
  })
  await page.route('**/api/content/stories', (route) => route.fulfill({ json: { ok: true, creator, stories: [
    story, { ...story, id: '20000000-0000-4000-8000-000000000002', status: 'offered', headline: 'Older offered candidate' },
  ] } }))
  await page.route(`**/api/content/round/${roundId}`, async (route) => {
    details++
    const response = await route.fetch()
    const body = await response.json()
    body.contract.creatorContentStory.contentIdea.title = 'Perfect GIR, But Putting Struggles'
    await route.fulfill({ json: body })
  })
  await login(page)
  await expect(page.getByText('1 story available', { exact: true })).toBeVisible()
  await page.goto('/creator')
  const card = page.getByTestId(`card-story-${storyId}`)
  await expect(card.getByRole('heading', { name: story.headline, exact: true })).toBeVisible()
  await expect(card.getByText('Shared', { exact: true })).toBeVisible()
  await expect(page.getByText('Offered', { exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Created within' })).toHaveValue('all')
  await expect(page.getByRole('slider', { name: /Minimum relevance/ })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: 'Filter by relevance' })).not.toBeChecked()
  await expect(card.getByTestId(`button-request-approval-${storyId}`)).toHaveCount(0)
  await expect(card.getByTestId(`button-download-scorecard-${storyId}`)).toHaveCount(0)
  expect(details).toBe(0)
  await card.getByRole('button', { name: 'Expand story' }).click()
  await expect(card.getByRole('heading', { name: 'Perfect GIR, But Putting Struggles' })).toBeVisible()
  await expect(card.getByTestId(`text-story-headline-${storyId}`)).toHaveText(story.headline)
  await expect(card.getByTestId(`button-download-scorecard-${storyId}`)).toBeDisabled()
  expect(requests.every((r) => r.startsWith('GET '))).toBe(true)
  expect(requests.some((r) => /generate|player_stories/.test(r))).toBe(false)
  await page.getByRole('combobox', { name: 'Created within' }).selectOption('7')
  await expect(page.getByTestId('status-story-queue-filtered-empty')).toBeVisible()
  await expect(page.getByTestId('status-story-queue-empty')).toHaveCount(0)
})

for (const status of [401, 403, 500, 404]) {
  test(`list ${status} is a visible failure, not an empty queue`, async ({ page }) => {
    await page.route('**/api/content/stories', (route) => route.fulfill({ status, json: { error: 'PRIVATE upstream body' } }))
    await login(page)
    await page.goto('/creator')
    await expect(page.getByTestId('status-creator-error')).toBeVisible()
    await expect(page.getByTestId('status-story-queue-empty')).toHaveCount(0)
    await expect(page.getByText('PRIVATE upstream body')).toHaveCount(0)
    if (status === 401) await expect(page.getByRole('link', { name: 'Sign in again' })).toBeVisible()
    else await expect(page.getByTestId('button-retry-creator-dashboard')).toBeVisible()
    if (status === 403) await expect(page.getByText(/Creator access is unavailable/)).toBeVisible()
    if (status === 404) await expect(page.getByText(/origin and routing/)).toBeVisible()
  })
}

test('relevance checkbox defaults off and enabled slider uses the actual candidate score', async ({ page }) => {
  await page.route('**/api/content/stories', (route) => route.fulfill({ json: { ok: true, creator, stories: [
    { ...story, significance_score: 78 },
    { ...story, id: '20000000-0000-4000-8000-000000000002', headline: 'Low score story', significance_score: 60 },
    { ...story, id: '20000000-0000-4000-8000-000000000003', headline: 'Unscored eligible story' },
  ] } }))
  await login(page)
  await page.goto('/creator')
  const slider = page.getByRole('slider', { name: /Minimum relevance/ })
  const enabled = page.getByRole('checkbox', { name: 'Filter by relevance' })
  await expect(enabled).not.toBeChecked()
  await expect(slider).toBeDisabled()
  await expect(page.getByRole('heading', { name: 'Low score story' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Unscored eligible story' })).toBeVisible()
  await enabled.check()
  await expect(slider).toBeEnabled()
  await slider.fill('80')
  await expect(page.getByRole('heading', { name: story.headline })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Low score story' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Unscored eligible story' })).toHaveCount(0)
  await slider.fill('70')
  await expect(page.getByRole('heading', { name: story.headline })).toBeVisible()
  await enabled.uncheck()
  await expect(page.getByRole('heading', { name: 'Low score story' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Unscored eligible story' })).toBeVisible()
})
for (const kind of ['missing', 'json', 'html', 'empty'] as const) {
  test(`list ${kind} distinguishes invalid responses from validated empty success`, async ({ page }) => {
    await page.route('**/api/content/stories', (route) => route.fulfill(kind === 'html'
      ? { contentType: 'text/html', body: '<html>routing</html>' }
      : kind === 'json' ? { contentType: 'application/json', body: '{' }
        : { json: kind === 'empty' ? { ok: true, creator, stories: [] } : { ok: true, stories: [] } }))
    await login(page)
    await page.goto('/creator')
    await expect(page.getByTestId(kind === 'empty' ? 'status-story-queue-empty' : 'status-creator-error')).toBeVisible()
  })
}

for (const status of [403, 500, 200]) {
  test(`detail ${status} preserves candidate and recognizes existing Share with Creator approval`, async ({ page }) => {
    let approvalRequests = 0
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/approval-request')) approvalRequests++
    })
    await page.route('**/api/content/stories', (route) => route.fulfill({ json: { ok: true, creator, stories: [story] } }))
    await page.route(`**/api/content/round/${roundId}`, async (route) => {
      if (status !== 200) return route.fulfill({ status, json: { error: 'PRIVATE' } })
      const response = await route.fetch()
      const body = await response.json()
      body.contract.creatorContentStory.contentIdea = null
      // Share with Creator is the player's approval; no request is necessary.
      body.contract.creatorContentStory.permission.granted_at = '2026-01-01T00:00:00Z'
      body.contract.creatorContentStory.permission.approval_requested_at = null
      await route.fulfill({ json: body })
    })
    await login(page)
    await page.goto('/creator')
    const card = page.getByTestId(`card-story-${storyId}`)
    await card.getByRole('button', { name: 'Expand story' }).click()
    await expect(card.getByTestId(`text-story-headline-${storyId}`)).toHaveText(story.headline)
    if (status !== 200) {
      await expect(card.getByTestId(`status-ideas-error-${storyId}`)).toBeVisible()
      await expect(card.getByTestId(`button-request-approval-${storyId}`)).toHaveCount(0)
      await expect(card.getByTestId(`button-download-scorecard-${storyId}`)).toHaveCount(0)
      if (status === 403) await expect(card.getByTestId(`button-dismiss-story-${storyId}`)).toBeDisabled()
    } else {
      await expect(card.getByTestId(`status-candidates-empty-${storyId}`)).toBeVisible()
      await expect(card.getByText('Approved by player', { exact: true })).toBeVisible()
      await expect(card.getByTestId(`button-download-scorecard-${storyId}`)).toBeEnabled()
      await expect(card.getByTestId(`button-request-approval-${storyId}`)).toHaveCount(0)
      expect(approvalRequests).toBe(0)
    }
  })
}

test('summary zero, nonzero, invalid and failed counts have distinct displays and retry', async ({ page, request }) => {
  await request.post(`${fixture}/__test/config`, { data: { summaryFixture: { body: { ok: true, creator, summary: { storyCount: 0 } } } } })
  await login(page)
  await expect(page.getByText('0 stories available', { exact: true })).toBeVisible()
  for (const count of [14, null, -1, 1.5, '12', 9007199254740992]) {
    await request.post(`${fixture}/__test/config`, { data: { summaryFixture: { body: { ok: true, creator, summary: { storyCount: count } } } } })
    await page.reload()
    if (count === 14) await expect(page.getByText('14 stories available', { exact: true })).toBeVisible()
    else {
      await expect(page.getByRole('button', { name: 'Retry count' })).toBeVisible()
      await expect(page.getByText('0 stories available', { exact: true })).toHaveCount(0)
    }
  }
  for (const status of [401, 403, 404, 500]) {
    await request.post(`${fixture}/__test/config`, { data: { summaryFixture: { status, body: { error: 'PRIVATE' } } } })
    await page.reload()
    await expect(page.getByRole('button', { name: 'Retry count' })).toBeVisible()
    await expect(page.getByText('PRIVATE')).toHaveCount(0)
  }
  await request.post(`${fixture}/__test/config`, { data: {} })
  await page.getByRole('button', { name: 'Retry count' }).click()
  await expect(page.getByText('1 story available', { exact: true })).toBeVisible()
  await expect(page.getByText(/\d+ followers/)).toHaveCount(0)
})

test('sign-out and account change discard a delayed list response', async ({ page, context }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  let started = false
  await page.route('**/api/content/stories', async (route) => {
    started = true
    await pending
    await route.fulfill({ json: { ok: true, creator, stories: [story] } }).catch(() => {})
  })
  await login(page)
  await page.goto('/creator')
  await expect.poll(() => started).toBe(true)
  const other = await context.newPage()
  await other.goto('/dashboard')
  await other.setViewportSize({ width: 390, height: 844 })
  await other.getByRole('button', { name: 'Open navigation menu' }).click()
  await other.getByRole('button', { name: 'Sign Out' }).click()
  await expect(other).toHaveURL(/\/login$/)
  await expect(page.getByTestId('status-creator-error')).toBeVisible()
  release()
  await expect(page.getByTestId(`card-story-${storyId}`)).toHaveCount(0)
  await page.unroute('**/api/content/stories')
  await login(other, 'player@example.test')
  await expect(page.getByText(/Creator access is unavailable/)).toBeVisible()
  await expect(page.getByTestId(`card-story-${storyId}`)).toHaveCount(0)
  await other.close()
})

test('revoked approval action clears loaded detail but preserves the candidate card', async ({ page }) => {
  await login(page)
  await page.goto('/creator')
  const card = page.getByTestId(`card-story-${storyId}`)
  await card.getByRole('button', { name: 'Expand story' }).click()
  await expect(card.getByTestId(`section-story-candidates-${storyId}`)).toBeVisible()
  await page.route(`**/api/content/stories/${storyId}/approval-request`,
    (route) => route.fulfill({ status: 403, json: { error: 'PRIVATE upstream permission detail' } }))
  await card.getByTestId(`button-request-approval-${storyId}`).click()
  await expect(card.getByTestId(`status-ideas-error-${storyId}`)).toBeVisible()
  await expect(card.getByTestId(`section-story-candidates-${storyId}`)).toHaveCount(0)
  await expect(card.getByTestId(`text-story-headline-${storyId}`)).toBeVisible()
  await expect(card.getByTestId(`button-dismiss-story-${storyId}`)).toBeDisabled()
  await expect(page.getByText('PRIVATE upstream permission detail')).toHaveCount(0)
})

test('sign-out clears a delayed round-detail response without removing the session guard', async ({ page, context }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  let started = false
  await page.route(`**/api/content/round/${roundId}`, async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    started = true
    await pending
    await route.fulfill({ json: body }).catch(() => {})
  })
  await login(page)
  await page.goto('/creator')
  await page.getByTestId(`button-toggle-story-${storyId}`).click()
  await expect.poll(() => started).toBe(true)
  const other = await context.newPage()
  await other.goto('/dashboard')
  await other.setViewportSize({ width: 390, height: 844 })
  await other.getByRole('button', { name: 'Open navigation menu' }).click()
  await other.getByRole('button', { name: 'Sign Out' }).click()
  await expect(other).toHaveURL(/\/login$/)
  await expect(page.getByTestId('status-creator-error')).toBeVisible()
  release()
  await expect(page.getByTestId(`card-story-${storyId}`)).toHaveCount(0)
  await expect(page.getByTestId(`section-story-candidates-${storyId}`)).toHaveCount(0)
  await other.close()
})
