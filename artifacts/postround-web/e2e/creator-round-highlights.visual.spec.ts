import { expect, test, type Page } from '@playwright/test'

test.setTimeout(90_000)

const storyId = '20000000-0000-4000-8000-000000000001'
const candidateId = '40000000-0000-4000-8000-000000000001'

async function openCreatorStory(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport)
  await page.goto('/login')
  await page.getByLabel('Email address').fill('creator@example.test')
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)

  await page.goto('/creator')
  await expect(page.getByTestId(`card-story-${storyId}`)).toBeVisible()
  await expect(page.getByTestId('section-story-candidates-' + storyId)).toBeVisible()
  await expect(page.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  await expect(page.getByTestId('round-highlights')).toBeVisible()
  await page.addStyleTag({ content: 'body > div > header { display: none !important; }' })
}

async function expectStorySectionsToRemainVisible(page: Page) {
  await expect(page.getByTestId(`card-story-candidate-${candidateId}`)).toBeVisible()
  await expect(page.getByTestId(`section-coaching-reflection-${storyId}`)).toBeVisible()
  await expect(page.getByTestId(`button-request-approval-${storyId}`)).toBeVisible()
  await expect(page.getByTestId(`section-share-scorecard-${storyId}`)).toBeVisible()
}

test('Round Highlights stays compact by default on desktop and expands to full details', async ({ page }) => {
  await openCreatorStory(page, { width: 1440, height: 1000 })

  const highlights = page.getByTestId('round-highlights')
  const fullDetails = page.getByTestId('scorecard-full-details')

  await expect(fullDetails).not.toHaveAttribute('open', '')
  await expect(page.getByTestId('scorecard-hole-1')).toBeHidden()
  await expect(highlights).toHaveScreenshot('round-highlights-desktop-compact.png', {
    animations: 'disabled',
  })
  await expectStorySectionsToRemainVisible(page)

  await fullDetails.getByText('View full round details').click()

  await expect(fullDetails).toHaveAttribute('open', '')
  await expect(page.getByTestId('scorecard-hole-1')).toContainText(/Fairway hit.*GIR hit/)
  await expect(page.getByTestId('scorecard-hole-note-1')).toHaveText(
    '"Stayed patient after the approach finished short."',
  )
  await expect(highlights).toHaveScreenshot('round-highlights-desktop-expanded.png', {
    animations: 'disabled',
  })
  await expectStorySectionsToRemainVisible(page)
})

test('Round Highlights stays compact and wraps without overflow on mobile', async ({ page }) => {
  await openCreatorStory(page, { width: 390, height: 844 })

  const highlights = page.getByTestId('round-highlights')

  await expect(page.getByTestId('scorecard-full-details')).not.toHaveAttribute('open', '')
  await expect(page.getByTestId('scorecard-hole-1')).toBeHidden()
  await expect(highlights).toHaveScreenshot('round-highlights-mobile-compact.png', {
    animations: 'disabled',
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  )
  await expectStorySectionsToRemainVisible(page)
})