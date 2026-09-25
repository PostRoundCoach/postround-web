import { expect, test, type Page } from '@playwright/test'

test.setTimeout(90_000)

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
  await expect(page.getByText('Fixture deletion unavailable')).toBeVisible()
  await expect(deleteButton(page)).toBeEnabled()
  expect(requests).toBe(1)
})