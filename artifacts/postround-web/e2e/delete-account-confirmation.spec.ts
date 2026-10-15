import { expect, test, type Page } from '@playwright/test'

test.setTimeout(90_000)

test.beforeEach(async ({ context }) => {
  await context.route('**/*', async (route) => {
    const host = new URL(route.request().url()).hostname
    if (host !== 'localhost' && host !== '127.0.0.1') {
      throw new Error(`Forbidden non-fixture request to ${host}`)
    }
    await route.continue()
  })
})

const deleteButton = (page: Page) => page.getByRole('button', { name: 'Permanently Delete Account' })

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('player@example.test')
  await page.getByLabel('Password', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 })
  await page.goto('/delete-account')
  await expect(page.getByRole('heading', { name: 'Delete Account', exact: true })).toBeVisible()
}

test('confirmation requires the exact visible value and acknowledgment', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  await signIn(page)

  const input = page.getByLabel('Type DELETE to confirm')
  const checkbox = page.getByRole('checkbox', { name: /I understand this permanently deletes/ })
  const button = deleteButton(page)

  await expect(input).toHaveValue('')
  await expect(checkbox).not.toBeChecked()
  await expect(button).toBeDisabled() // unchecked / empty

  await checkbox.check()
  await expect(button).toBeDisabled() // checked / empty
  await input.fill('delete')
  await expect(input).toHaveValue('delete')
  await expect(input).toHaveCSS('text-transform', 'none')
  await expect(button).toBeDisabled() // checked / wrong case

  await input.fill('WRONG')
  await expect(button).toBeDisabled() // checked / incorrect text
  await input.fill('DELETE ')
  await expect(input).toHaveValue('DELETE ')
  await expect(button).toBeDisabled() // checked / trailing space

  await checkbox.uncheck()
  await input.fill('DELETE')
  await expect(button).toBeDisabled() // unchecked / DELETE
  await checkbox.check()
  await expect(input).toHaveValue('DELETE')
  await expect(button).toBeEnabled() // checked / exact DELETE

  await input.fill('DELETE ')
  await expect(button).toBeDisabled()
  await input.fill('DELETE')
  await expect(button).toBeEnabled()
  await checkbox.uncheck()
  await expect(button).toBeDisabled()
  await checkbox.check()
  await expect(button).toBeEnabled()
  expect(consoleErrors).toEqual([])
  // Do not submit: this test must never request account deletion.
})

test('normal deletion acknowledgment reaches success and user-triggered home navigation', async ({ page }) => {
  await signIn(page)
  let deletions = 0
  await page.route('http://127.0.0.1:54321/api/account/delete', async (route) => {
    deletions++
    await route.fulfill({
      json: { ok: true, deleted: true },
      headers: { 'access-control-allow-origin': '*' },
    })
  })
  await page.getByRole('checkbox').check()
  await page.getByLabel('Type DELETE to confirm').fill('DELETE')
  await deleteButton(page).click()
  await expect(page.getByRole('heading', { name: 'Account Deleted', exact: true })).toBeVisible()
  await expect(deleteButton(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Return to Home' }).click()
  await expect(page).toHaveURL('http://localhost:3100/')
  expect(deletions).toBe(1)
})

test('signed-out visitors cannot access the confirmation form', async ({ page }) => {
  await page.goto('/delete-account')
  await expect(page.getByRole('heading', { name: 'Sign In Required' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign In to Continue' })).toHaveAttribute('href', '/login?next=/delete-account')
  await expect(deleteButton(page)).toHaveCount(0)
})

test('a pending deletion locks both confirmations and prevents a second submission', async ({ page }) => {
  await signIn(page)
  let releaseResponse!: () => void
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve })
  let requests = 0
  await page.route('http://127.0.0.1:54321/api/account/delete', async (route) => {
    requests += 1
    expect(route.request().postDataJSON()).toEqual({ confirmation: 'DELETE' })
    await responseGate
    await route.fulfill({
      status: 503,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Fixture deletion unavailable' }),
    })
  })

  const input = page.getByLabel('Type DELETE to confirm')
  const checkbox = page.getByRole('checkbox', { name: /I understand this permanently deletes/ })
  await checkbox.check()
  await input.fill('DELETE')
  await deleteButton(page).click()
  await expect(page.getByRole('button', { name: 'Deleting Account...' })).toBeDisabled()
  await expect(input).toBeDisabled()
  await expect(checkbox).toBeDisabled()
  expect(requests).toBe(1)
  releaseResponse()
  await expect(page.getByText(/We could not confirm the account deletion outcome/)).toBeVisible()
  await expect(deleteButton(page)).toBeDisabled()
  expect(requests).toBe(1)
})

test('real Supabase client cleanup keeps confirmed success when logout returns an error', async ({ page }) => {
  await signIn(page)
  let deletions = 0
  await page.route('http://127.0.0.1:54321/api/account/delete', async (route) => {
    deletions++
    await route.fulfill({
      json: { ok: true, deleted: true },
      headers: { 'access-control-allow-origin': '*' },
    })
  })
  await page.route('http://127.0.0.1:54321/auth/v1/logout**', async (route) => {
    expect(new URL(route.request().url()).searchParams.get('scope')).toBe('local')
    await route.fulfill({
      status: 500,
      json: { message: 'fixture logout failure' },
      headers: { 'access-control-allow-origin': '*' },
    })
  })
  await page.getByRole('checkbox').check()
  await page.getByLabel('Type DELETE to confirm').fill('DELETE')
  await deleteButton(page).click()
  await expect(page.getByRole('heading', { name: 'Account Deleted', exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Your account is deleted, but')
  await expect(deleteButton(page)).toHaveCount(0)
  expect(deletions).toBe(1)
})