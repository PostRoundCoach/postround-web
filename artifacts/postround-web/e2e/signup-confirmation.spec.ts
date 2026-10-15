import { expect, test, type Page } from '@playwright/test'
import { androidStoreUrl, ANDROID_INTERNAL_TEST_URL } from '../src/lib/referrals/config'

// Match the runtime fixture's validation, including deliberately invalid configuration.
const configuredStore = (() => {
  const old = process.env.ANDROID_STORE_URL
  process.env.ANDROID_STORE_URL = process.env.E2E_ANDROID_STORE_URL ?? ''
  try { return androidStoreUrl() } finally {
    if (old === undefined) delete process.env.ANDROID_STORE_URL
    else process.env.ANDROID_STORE_URL = old
  }
})()

async function expectInternalTest(page: Page) {
  const fallback = page.getByRole('link', { name: 'Join Google Play internal test', exact: true })
  await expect(fallback).toBeVisible()
  await expect(fallback).toHaveAttribute('href', ANDROID_INTERNAL_TEST_URL)
  await expect(fallback).toHaveAttribute('target', '_blank')
  await expect(page.getByText(/Join the internal test using an eligible or invited Google account/)).toBeVisible()
  await expect(page.getByText(/then install Post Round before opening it/)).toBeVisible()
  await expect(page.getByText(/If Google Play says you do not have access, continue on web/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue on web' })).toHaveAttribute('href', '/dashboard')
  return fallback
}

const fixture = 'http://127.0.0.1:54321'
async function configure(page: Page, data: Record<string, unknown>) {
  await page.request.post(`${fixture}/__test/config`, { data })
}
async function signup(page: Page) {
  await page.getByLabel('Display Name').fill('Fixture Golfer')
  await page.getByLabel('Email address').fill('new-player@example.test')
  await page.getByLabel('Password', { exact: true }).fill('ChosenPassword9')
  await page.getByLabel('Confirm password', { exact: true }).fill('ChosenPassword9')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.getByLabel('6-digit code').fill('123456')
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
}
async function metrics(page: Page) {
  return (await page.request.get(`${fixture}/__test/referrals`)).json()
}
test.beforeEach(async ({ page }) => {
  await configure(page, { resetReferrals: true, resetAuth: true })
})

test('creator password signup confirms durable attribution; CTAs do not claim or issue events', async ({ page }, testInfo) => {
  await page.goto('/r/creator-fixture')
  await signup(page)
  await expect(page).toHaveURL(/\/signup\/complete$/)
  await expect(page.getByRole('heading', { name: 'Welcome to Post Round' })).toBeVisible()
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
  expect((await page.context().cookies()).some((c) => c.name === 'pr_ref')).toBe(false)
  const before = await metrics(page)
  expect(before.claims).toBe(1)
  // Mock profile state proves web wiring only, not SQL/transaction behavior.
  expect(before.attributions).toHaveLength(1)
  expect(before.profiles.find((p: { favorite_creator_id: string | null }) =>
    p.favorite_creator_id === before.attributions[0].creator_id)).toBeTruthy()
  expect(before.profileWrites).toBe(1)
  const ctaReferralRequests: string[] = []
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path === '/referrals/claim' || path.startsWith('/r/')) ctaReferralRequests.push(path)
  })
  expect(page.context().pages()).toHaveLength(1)
  const open = page.getByRole('link', { name: 'Open Post Round', exact: true })
  await expect(open).toHaveAttribute('href', 'golf-coach://')
  await expect(open).toHaveAttribute('target', '_blank')
  const fallback = await expectInternalTest(page)
  await fallback.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault()))
  await fallback.click()
  if (configuredStore) {
    const download = page.getByRole('link', { name: 'Download Post Round' })
    await expect(download).toHaveAttribute('href', configuredStore)
    await download.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault()))
    await download.click()
  } else {
    await expect(page.getByRole('link', { name: 'Download Post Round' })).toHaveCount(0)
  }
  // Prevent the OS scheme handler in this web-only fixture, recording the exact user-clicked href.
  await open.evaluate((element) => element.addEventListener('click', (event) => {
    event.preventDefault()
    element.setAttribute('data-clicked-href', (element as HTMLAnchorElement).href)
  }))
  await open.click()
  await expect(open).toHaveAttribute('data-clicked-href', 'golf-coach://')
  expect(ctaReferralRequests).toEqual([])
  expect(await metrics(page)).toEqual(before)
  expect(ctaReferralRequests).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('signup-confirmation.jpg'), fullPage: true })
  await page.setViewportSize({ width: 402, height: 874 })
  await expectInternalTest(page)
  await page.screenshot({ path: testInfo.outputPath('signup-confirmation-mobile.jpg'), fullPage: true })
  await page.reload()
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
  expect(await metrics(page)).toEqual(before)
  // A later creator click cannot change the original attribution.
  await page.goto('/r/second-creator')
  await page.goto('/signup/complete')
  await expect(page.getByText(/Your original attribution cannot be replaced/)).toBeVisible()
  expect((await metrics(page)).attributions).toEqual(before.attributions)
  await expect.poll(async () => (await metrics(page)).claims).toBe(2)
  expect((await metrics(page)).profileWrites).toBe(1)
  await page.getByRole('link', { name: 'Continue on web' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('mobile referral signup exposes the internal-testing fallback without CTA mutations', async ({ browser }, testInfo) => {
  // Android UA is presentation evidence only, not Android OS or installed-app proof.
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36',
    viewport: { width: 402, height: 874 },
  })
  const page = await context.newPage()
  // Model following a web referral then continuing signup on mobile. Override
  // only this entry request: Android store-first routing is tested separately.
  await page.route('**/r/creator-fixture', (route) => route.continue({
    headers: { ...route.request().headers(), 'user-agent': 'Desktop referral fixture' },
  }), { times: 1 })
  await page.goto('/r/creator-fixture')
  await signup(page)
  await expect(page).toHaveURL(/\/signup\/complete$/)
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
  const download = await expectInternalTest(page)
  const before = await metrics(page)
  const open = page.getByRole('link', { name: 'Open Post Round', exact: true })
  await expect(open).toHaveAttribute('href', 'golf-coach://')
  await expect(open).toHaveAttribute('target', '_blank')
  // Canceled click proves only web wiring, never OS launch/failure or fallback survival.
  await open.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault()))
  await open.click()
  await expect(page).toHaveURL(/\/signup\/complete$/)
  await expect(page.getByText(/If the app does not open/)).toBeVisible()
  await expectInternalTest(page)
  await download.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault()))
  await download.click()
  expect(await metrics(page)).toEqual(before)
  await page.screenshot({ path: testInfo.outputPath('android-confirmation-fallback.jpg'), fullPage: true })
  // Other mobile launch behavior remains the existing separate browsing context.
  const iosContext = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone) Safari/604.1' })
  await iosContext.addCookies(await context.cookies())
  const iosPage = await iosContext.newPage()
  await iosPage.goto('/signup/complete')
  const iosOpen = iosPage.getByRole('link', { name: 'Open Post Round', exact: true })
  await expect(iosOpen).toHaveAttribute('href', 'golf-coach://')
  await expect(iosOpen).toHaveAttribute('target', '_blank')
  await iosContext.close()
  await page.getByRole('link', { name: 'Continue on web' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  expect(await metrics(page)).toEqual(before)
  await context.close()
})

test('transient claim retains cookie, bounds explicit retries, and can recover on revisit', async ({ page }) => {
  await configure(page, { failReferralClaim: true })
  await page.goto('/r/creator-fixture')
  await signup(page)
  await expect(page.getByText(/We have not confirmed your creator referral yet/)).toBeVisible()
  for (let i = 0; i < 3; i++) {
    const retry = page.getByRole('button', { name: 'Check again' })
    await expect(retry).toBeEnabled()
    await retry.click()
    await expect.poll(async () => (await metrics(page)).claims).toBe(i + 2)
  }
  await expect(page.getByRole('button', { name: 'Check again' })).toHaveCount(0)
  expect((await page.context().cookies()).some((c) => c.name === 'pr_ref')).toBe(true)
  await expect(page.getByRole('link', { name: 'Continue on web' })).toBeVisible()
  await configure(page, {})
  await page.reload()
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
})

test('HTTP claim success without a durable row is never applied; read failure stays retryable', async ({ page }) => {
  await page.goto('/r/creator-fixture')
  await page.route('**/referrals/claim', (route) => route.fulfill({
    json: { result: 'claimed', status: 'unavailable' },
  }))
  await signup(page)
  await expect(page.getByText(/We could not confirm your creator referral right now/)).toBeVisible()
  await page.unroute('**/referrals/claim')
  await page.getByRole('button', { name: 'Check again' }).click()
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
})

test('claimed RPC result without durable attribution is not confirmation', async ({ page }) => {
  await configure(page, { claimWithoutAttribution: true })
  await page.goto('/r/creator-fixture')
  await signup(page)
  await expect(page).toHaveURL(/\/signup\/complete$/)
  await expect(page.getByText(/No creator referral was confirmed/)).toBeVisible()
  expect((await metrics(page)).claims).toBe(1)
  expect((await metrics(page)).attributions).toHaveLength(0)
})

for (const evidence of ['malformed', '90000000-0000-4000-8000-999999999999']) {
  test(`invalid or expired evidence is truthful (${evidence})`, async ({ page }) => {
    await page.context().addCookies([{ name: 'pr_ref', value: evidence, url: 'http://localhost:3100', httpOnly: true }])
    await page.goto('/signup')
    await signup(page)
    await expect(page).toHaveURL(/\/signup\/complete$/)
    await expect(page.getByText(/No creator referral was confirmed/)).toBeVisible()
    expect((await page.context().cookies()).some((c) => c.name === 'pr_ref')).toBe(false)
    await page.reload()
    await expect(page.getByText(/No creator referral was confirmed/)).toBeVisible()
    expect((await metrics(page)).attributions).toHaveLength(0)
  })
}

test('ordinary password signup still reaches dashboard; no-evidence direct access is truthful; expired session guarded', async ({ page, request }) => {
  const signedOut = await request.get('/signup/complete', { maxRedirects: 0 })
  expect(signedOut.status()).toBe(307)
  expect(await signedOut.text()).not.toContain('Your account is ready')
  const rsc = await request.get('/signup/complete', { headers: { RSC: '1' }, maxRedirects: 0 })
  expect(await rsc.text()).not.toContain('Your account is ready')
  await page.goto('/signup')
  await signup(page)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/signup/complete?referral=claimed')
  await expect(page.getByText(/No creator referral was confirmed/)).toBeVisible()
  await page.context().clearCookies()
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
})

test('attribution read failure never claims blindly and retry recovers preserved evidence', async ({ page }) => {
  await configure(page, { failAttributionRead: true })
  await page.goto('/r/creator-fixture')
  await signup(page)
  await expect(page.getByText(/We could not confirm your creator referral right now/)).toBeVisible()
  expect((await metrics(page)).claims).toBe(0)
  await configure(page, {})
  await page.getByRole('button', { name: 'Check again' }).click()
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
})

test('creator context survives cookie expiry during email code entry', async ({ page }) => {
  await page.goto('/r/creator-fixture')
  await page.getByLabel('Display Name').fill('Fixture Golfer')
  await page.getByLabel('Email address').fill('new-player@example.test')
  await page.getByLabel('Password', { exact: true }).fill('ChosenPassword9')
  await page.getByLabel('Confirm password', { exact: true }).fill('ChosenPassword9')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByLabel('6-digit code')).toBeVisible()
  await page.context().clearCookies({ name: 'pr_ref' })
  await page.getByLabel('6-digit code').fill('123456')
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
  await expect(page).toHaveURL(/\/signup\/complete$/)
  await expect(page.getByText(/No creator referral was confirmed/)).toBeVisible()
  expect((await metrics(page)).claims).toBe(0)
  expect((await metrics(page)).profileWrites).toBe(0)
})

test('pending established claim fills only a NULL mock favorite from the original event', async ({ page }) => {
  await page.goto('/r/creator-fixture')
  await signup(page)
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
  const original = await metrics(page)
  await configure(page, { favoriteCreator: null })
  await page.goto('/r/second-creator')
  await page.goto('/signup/complete')
  await expect.poll(async () => (await metrics(page)).profileWrites).toBe(2)
  expect((await metrics(page)).attributions).toEqual(original.attributions)
  expect((await metrics(page)).profiles).toEqual(original.profiles)
  // An established attribution must not hide a transaction failure.
  await configure(page, { favoriteCreator: null, failReferralClaim: true })
  await page.goto('/r/second-creator')
  await page.goto('/signup/complete')
  await expect(page.getByText(/We have not confirmed your creator referral yet/)).toBeVisible()
  expect((await page.context().cookies()).some((c) => c.name === 'pr_ref')).toBe(true)
  await configure(page, {})
  await page.getByRole('button', { name: 'Check again' }).click()
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
  expect((await page.context().cookies()).some((c) => c.name === 'pr_ref')).toBe(false)
  await configure(page, { favoriteCreator: 'intentional-other-creator' })
  await page.goto('/r/second-creator')
  await page.goto('/signup/complete')
  await expect.poll(async () => (await metrics(page)).claims).toBe(5)
  expect((await metrics(page)).profileWrites).toBe(3)
  expect((await metrics(page)).profiles.some((p: { favorite_creator_id: string | null }) =>
    p.favorite_creator_id === 'intentional-other-creator')).toBe(true)
})

test('Android routing preserves install-before-signup and opaque Install Referrer contract', async ({ request }) => {
  const response = await request.get('/r/creator-fixture', {
    headers: { 'user-agent': 'Android fixture browser' }, maxRedirects: 0,
  })
  expect(response.status()).toBe(302)
  const target = new URL(response.headers().location)
  if (configuredStore) {
    expect(target.origin).toBe('https://play.google.com')
    const evidence = new URLSearchParams(target.searchParams.get('referrer')!).get('pr_ref')
    expect(evidence).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.headers()['set-cookie']).toContain(`pr_ref=${evidence}`)
  } else {
    expect(target.pathname).toBe('/signup')
  }
})
