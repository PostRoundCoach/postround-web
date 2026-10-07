import { expect, test, type Page } from '@playwright/test'

const fixture = 'http://127.0.0.1:54321'
const email = 'signup@example.test'
const password = 'ChosenPassword9'
async function configure(page: Page, data: Record<string, unknown>) {
  await page.request.post(`${fixture}/__test/config`, { data })
}
async function metrics(page: Page) {
  return (await page.request.get(`${fixture}/__test/auth`)).json()
}
async function details(page: Page, address = email, chosen = password) {
  await page.getByLabel('Display Name').fill(' New Golfer ')
  await page.getByLabel('Email address').fill(address)
  await page.getByLabel('Password', { exact: true }).fill(chosen)
  await page.getByLabel('Confirm password', { exact: true }).fill(chosen)
}
async function start(page: Page, address = email) {
  await details(page, address)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByLabel('6-digit code')).toBeVisible()
}
async function verify(page: Page, code = '123456') {
  await page.getByLabel('6-digit code').fill(code)
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
}
test.beforeEach(async ({ page }) => {
  await configure(page, { resetReferrals: true, resetAuth: true })
})

test('signup saves chosen credentials, gates access, then signs out and back into the same account', async ({ page }) => {
  await page.goto('/signup')
  await details(page)
  const [request] = await Promise.all([
    page.waitForRequest('**/auth/v1/signup', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Create account', exact: true }).click(),
  ])
  await expect(page.getByLabel('6-digit code')).toBeVisible()
  const payload = request.postDataJSON()
  expect(payload).toMatchObject({ email, password, data: { display_name: 'New Golfer' } })
  const pending = await metrics(page)
  const id = pending.users.find((user: { email: string }) => user.email === email).id
  expect(pending.users.find((user: { email: string }) => user.email === email).confirmed).toBe(false)
  expect(await page.evaluate(() => sessionStorage.getItem('postround-pending-signup'))).not.toContain(password)
  const protectedPage = await page.request.get('/signup/complete', { maxRedirects: 0 })
  expect(protectedPage.status()).toBe(307)
  expect(await protectedPage.text()).not.toContain('Your account is ready')
  const dashboard = await page.request.get('/dashboard', { maxRedirects: 0 })
  expect(dashboard.status()).toBe(307)
  const verification = page.waitForRequest('**/auth/v1/verify')
  await verify(page)
  expect((await verification).postDataJSON()).toMatchObject({ email, token: '123456', type: 'signup' })
  await expect(page).toHaveURL(/\/dashboard$/)
  expect((await metrics(page)).passwordLogins).toBe(1)
  await page.getByRole('button', { name: /sign out/i }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword9')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page.getByText('Incorrect email or password. Please try again.')).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(password)
  const identity = page.waitForResponse((response) => response.url().includes('/auth/v1/token?grant_type=password') && response.status() === 200)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  expect((await (await identity).json()).user.id).toBe(id)
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('validation, confirmation, keyboard show/hide and autocomplete are usable', async ({ page }) => {
  await page.goto('/signup')
  await details(page, email, 'onlyletters')
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'new-password')
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password', exact: true }).click()
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.locator('p[role="alert"]')).toContainText('letter and one number')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.locator('p[role="alert"]')).toContainText('Passwords do not match')
  expect((await metrics(page)).signups).toBe(0)
})

test('invalid and expired codes never finish; signup resend is throttled and retryable', async ({ page }) => {
  await page.goto('/signup')
  await start(page)
  await verify(page, '000000')
  await expect(page.locator('p[role="alert"]')).toContainText('Invalid or expired code')
  await configure(page, { auth: { expiredCode: true } })
  await verify(page)
  await expect(page.locator('p[role="alert"]')).toContainText('Invalid or expired code')
  expect((await metrics(page)).passwordLogins).toBe(0)
  await page.clock.install()
  await page.clock.fastForward(61_000)
  await configure(page, { auth: { throttleResend: true } })
  const resend = page.waitForRequest('**/auth/v1/resend')
  await page.getByRole('button', { name: 'Resend signup code', exact: true }).click()
  expect((await resend).postDataJSON()).toMatchObject({ email, type: 'signup' })
  await expect(page.locator('p[role="alert"]')).toContainText('Please wait')
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled()
  await page.clock.fastForward(61_000)
  await configure(page, {})
  await page.getByRole('button', { name: 'Resend signup code', exact: true }).click()
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled()
  await verify(page)
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('refresh keeps referred verification context but no password; resend cannot change credentials', async ({ page }) => {
  await page.goto('/r/creator-fixture')
  await start(page)
  await page.reload()
  await expect(page.getByLabel('6-digit code')).toBeVisible()
  await expect(page.getByLabel('Signup password', { exact: true })).toHaveValue('')
  await page.getByLabel('Signup password', { exact: true }).fill(password)
  await verify(page)
  await expect(page).toHaveURL(/\/signup\/complete$/)
  await expect(page.getByText(/Your creator referral has been applied/)).toBeVisible()
  expect((await metrics(page)).signups).toBe(1)
})

for (const address of ['player@example.test', 'passwordless@example.test']) {
  test(`existing account safely stays out of completion (${address})`, async ({ page }) => {
    await page.goto('/signup')
    await start(page, address)
    await expect(page.locator('p[role="alert"]')).toContainText('does not replace')
    await verify(page)
    await expect(page.locator('p[role="alert"]')).toContainText('Invalid or expired code')
    await expect(page.getByRole('link', { name: 'Recover access', exact: true })).toBeVisible()
    expect((await metrics(page)).passwordLogins).toBe(0)
    // A fabricated signup response must not save the newly entered password.
    const login = await page.request.post(`${fixture}/auth/v1/token?grant_type=password`, {
      data: { email: address, password },
    })
    expect(login.status()).toBe(400)
    if (address === 'player@example.test') {
      const original = await page.request.post(`${fixture}/auth/v1/token?grant_type=password`, {
        data: { email: address, password: 'fixture-password' },
      })
      expect(original.status()).toBe(200)
    }
  })
}

test('unconfirmed existing account never claims that a newly entered password was saved', async ({ page }) => {
  await page.goto('/signup')
  await start(page, 'unconfirmed@example.test')
  await verify(page)
  await expect(page.locator('p[role="alert"]')).toContainText('signup does not replace an existing password')
  await expect(page).toHaveURL(/\/signup$/)
  const guarded = await page.request.get('/signup/complete', { maxRedirects: 0 })
  expect(guarded.status()).toBe(307)
  const original = await page.request.post(`${fixture}/auth/v1/token?grant_type=password`, {
    data: { email: 'unconfirmed@example.test', password: 'OriginalPassword9' },
  })
  expect(original.status()).toBe(200)
})

test('explicit duplicate and authoritative weak-password errors keep login/recovery safe', async ({ page }) => {
  await configure(page, { auth: { weakPassword: true } })
  await page.goto('/signup')
  await details(page)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.locator('p[role="alert"]')).toContainText('stronger password')
  await configure(page, { auth: { explicitDuplicate: true } })
  await details(page, 'player@example.test')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.locator('p[role="alert"]')).toContainText('does not replace')
  await expect(page.getByRole('link', { name: 'Recover access', exact: true })).toBeVisible()
})

test('duplicate submissions send a single signup request', async ({ page }) => {
  await configure(page, { auth: { signupDelay: 800 } })
  await page.goto('/signup')
  await details(page)
  await page.locator('form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await expect(page.getByLabel('6-digit code')).toBeVisible()
  expect((await metrics(page)).signups).toBe(1)
})

test('lost signup response resumes without recreating credentials; temporary verification errors can retry', async ({ page }) => {
  await page.goto('/signup')
  await page.route('**/auth/v1/signup', async (route) => {
    await route.fetch()
    await route.fulfill({ status: 503, json: { message: 'Response interrupted' } })
  })
  await start(page)
  await expect(page.locator('p[role="alert"]')).toContainText('could not complete')
  await page.unroute('**/auth/v1/signup')
  await page.reload()
  await page.getByLabel('Signup password', { exact: true }).fill(password)
  await configure(page, { auth: { failVerify: true } })
  await verify(page)
  await expect(page.locator('p[role="alert"]')).toContainText('temporarily unavailable')
  await configure(page, {})
  await verify(page)
  await expect(page).toHaveURL(/\/dashboard$/)
  expect((await metrics(page)).signups).toBe(1)
})

test('transient password probe preserves verified session for retry without reusing the code', async ({ page }) => {
  await page.goto('/signup')
  await start(page)
  // Signup OTP is accepted, but the immediate password-session probe is
  // temporarily unavailable. Retrying should use the preserved session, not
  // submit the already-spent signup code again.
  await configure(page, { failLogin: true })
  await verify(page)
  await expect(page.getByText(/temporarily unavailable/i)).toBeVisible()
  await configure(page, {})
  await verify(page)
  await expect(page).toHaveURL(/\/dashboard$/)
  expect((await metrics(page)).verifies).toBe(1)
})

test('lost verification response can resume the verified same identity without reusing the spent token', async ({ page }) => {
  await page.goto('/r/creator-fixture')
  await start(page)
  // The SDK saves a real session, but the following authoritative identity read
  // fails. Refresh must not send this referred signup straight to the dashboard.
  await page.route('**/auth/v1/user', async (route) => {
    // With no session the initial getUser does not send a network request.
    // The first real /user request is the authoritative read after verification.
    await route.fulfill({ status: 503, json: { message: 'Interrupted' } })
  })
  await verify(page)
  await expect(page.locator('p[role="alert"]')).toContainText('could not be confirmed')
  await page.unroute('**/auth/v1/user')
  await page.reload()
  await expect(page.getByLabel('6-digit code')).toBeVisible()
  await page.getByLabel('Signup password', { exact: true }).fill(password)
  await verify(page)
  await expect(page).toHaveURL(/\/signup\/complete$/)
  expect((await metrics(page)).signups).toBe(1)
  expect((await metrics(page)).verifies).toBe(1)
})

test('email autoconfirm is a configuration blocker, never funnel success', async ({ page }) => {
  await configure(page, { auth: { autoConfirm: true } })
  await page.goto('/signup')
  await start(page)
  const blocker = page.locator('p[role="alert"]').filter({ hasText: 'Email confirmation is not enabled' })
  await expect(blocker).toContainText('Email confirmation is not enabled')
  await expect(page.getByRole('button', { name: 'Verify email', exact: true })).toBeDisabled()
  expect((await metrics(page)).passwordLogins).toBe(0)
  await page.reload()
  await expect(page.locator('p[role="alert"]').filter({ hasText: 'Email confirmation is not enabled' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verify email', exact: true })).toBeDisabled()
  expect((await metrics(page)).passwordLogins).toBe(0)
})

test('existing recovery still sends a recovery request with its unchanged callback', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByLabel('Email address').fill('passwordless@example.test')
  const recovery = page.waitForRequest('**/auth/v1/recover*')
  await page.getByRole('button', { name: 'Send Reset Link', exact: true }).click()
  const url = new URL((await recovery).url())
  expect(url.searchParams.get('redirect_to')).toContain('/api/auth/callback?next=/reset-password')
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible()
})
