import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

const attribution = 'Post Round is developed and operated by PR Coaching Software.'
const pages = [
  ['/', 'Post Round — Play. Learn. Share.'],
  ['/privacy', 'Privacy Policy | Post Round'],
  ['/terms', 'Terms of Service | Post Round'],
  ['/support', 'Support | Post Round'],
  ['/delete-account', 'Delete Account | Post Round'],
] as const
const links = [
  ['Privacy Policy', '/privacy'],
  ['Terms of Service', '/terms'],
  ['Delete Account', '/delete-account'],
  ['Support', '/support'],
] as const

test.beforeEach(async ({ context }) => {
  // These checks can never fall back to production Auth, APIs or deletion.
  await context.route('**/*', async (route) => {
    const host = new URL(route.request().url()).hostname
    if (!['localhost', '127.0.0.1'].includes(host)) {
      throw new Error(`Forbidden non-fixture request to ${host}`)
    }
    await route.continue()
  })
})

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`public identity, links and layout at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    for (const [path, title] of pages) {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL(`http://localhost:3100${path}`)
      await expect(page).toHaveTitle(title)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /PR Coaching Software/)
      // The existing homepage nests its footer inside main, so its implicit
      // ARIA role differs from the legal pages. Check the shared element itself.
      const footer = page.locator('footer')
      await footer.scrollIntoViewIfNeeded()
      await expect(footer.getByText(attribution, { exact: true })).toBeVisible()
      for (const [name, href] of links) {
        const link = footer.getByRole('link', { name, exact: true })
        await expect(link).toHaveAttribute('href', href)
        await link.click()
        await expect(page).toHaveURL(`http://localhost:3100${href}`)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.goto(path)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      if (path === '/') {
        await expect(page.getByText('Play. Learn. Share.', { exact: true }).first()).toBeVisible()
        await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /PR Coaching Software/)
      }
      if (path === '/delete-account') {
        await expect(page.getByRole('heading', { name: 'Before you delete your account' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Sign In Required' })).toBeVisible()
        await expect(page.getByText('Deletion does not cancel billing.', { exact: true })).toBeVisible()
        await expect(page.getByRole('checkbox')).toHaveCount(0)
      }
      await page.locator('footer').scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `generated-artifacts/business-operator/${viewport.width}-${path.slice(1) || 'home'}-footer.png`,
      })
    }
    expect(errors).toEqual([])
  })
}

test('deletion instructions and business identity render without JavaScript or sign-in', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  const response = await page.goto('http://localhost:3100/delete-account')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Before you delete your account' })).toBeVisible()
  await expect(page.getByText(/type the exact word/)).toContainText('DELETE')
  await expect(page.locator('footer').getByText(attribution, { exact: true })).toBeVisible()
  await context.close()
})
