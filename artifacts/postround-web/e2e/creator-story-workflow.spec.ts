import { expect, test } from '@playwright/test'

test.setTimeout(90_000)

const storyId = '20000000-0000-4000-8000-000000000001'
const candidateId = '40000000-0000-4000-8000-000000000001'
const candidate = {
  id: candidateId, story_id: storyId, archetype: 'Achievement',
  title: 'The back-nine comeback', hook: 'A comeback worth sharing',
  summary: 'Fixture candidate summary.', why_interesting: 'It has a clear arc.',
  supporting_evidence: ['Recovered on the back nine'], relevant_holes: [10, 18],
  confidence: 0.92, suggested_format: 'Social caption',
  transcript_highlights: [], scorecard: [],
}

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('creator@example.test')
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
}

test('creator story queue persists candidates, approval, and dismissal state', async ({ page }) => {
  let dismissed = false
  let approvalRequests = 0
  let approvalStatus: 'pending' | 'approved' = 'pending'

  await page.route('**/api/content/ideas**', async (route) => {
    await route.fulfill({ json: { ok: true, ideas: dismissed ? [] : [candidate], permission_status: approvalStatus } })
  })
  await page.route('**/api/content/generate', async (route) => {
    await route.fulfill({ json: { ok: true, count: 1, candidates: [candidate], permission_status: approvalStatus } })
  })
  await page.route('**/rest/v1/story_permissions*', async (route) => {
    await route.fulfill({
      json: dismissed ? [] : [{
        story_id: storyId,
        granted_at: approvalStatus === 'approved' ? '2026-01-03T00:00:00.000Z' : null,
        story_candidates: { ...candidate, id: storyId, story_type: 'round_recap', headline: 'A comeback worth sharing', summary: 'A fixture story shared with the creator.', story_data: {}, round_id: '30000000-0000-4000-8000-000000000001', status: 'shared' },
      }],
    })
  })
  await page.route('**/api/content/stories/*/approval-request', async (route) => {
    approvalRequests += 1
    approvalStatus = 'pending'
    await route.fulfill({ json: { ok: true, story_id: storyId, permission_status: approvalStatus } })
  })
  await page.route('**/api/content/stories/*/dismissal', async (route) => {
    dismissed = true
    await route.fulfill({ json: { ok: true, story_id: storyId } })
  })
  await signIn(page)
  await page.goto('/creator')

  await expect(page.getByTestId(`card-story-${storyId}`)).toBeVisible()
  await page.getByTestId(`button-generate-story-${storyId}`).click()
  await page.getByTestId(`button-generate-draft-${candidateId}`).waitFor()
  await expect(page.getByText('Player approval required')).toBeVisible()
  await expect(page.getByTestId(`button-generate-draft-${candidateId}`)).toBeDisabled()

  await page.getByTestId(`button-request-approval-${storyId}`).click()
  await expect(page.getByText('Player approval required')).toBeVisible()
  await expect.poll(() => approvalRequests).toBe(1)
  await page.getByTestId(`button-request-approval-${storyId}`).click()
  await expect.poll(() => approvalRequests).toBe(2)

  approvalStatus = 'approved'
  await page.reload()
  await expect(page.getByText('Approved by player')).toBeVisible()
  await expect(page.getByTestId(`button-generate-draft-${candidateId}`)).toBeEnabled()

  await page.getByTestId(`button-dismiss-story-${storyId}`).click()
  await expect(page.getByTestId(`card-story-${storyId}`)).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('status-story-queue-empty')).toBeVisible()
})