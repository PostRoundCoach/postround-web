import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath: string) => fs.readFileSync(path.join(appDir, relativePath), 'utf8')

test('all four App Store-facing routes define unique metadata', () => {
  const pages = [
    ['privacy/page.tsx', 'Privacy Policy | Post Round'],
    ['terms/page.tsx', 'Terms of Service | Post Round'],
    ['support/page.tsx', 'Support | Post Round'],
    ['delete-account/page.tsx', 'Delete Account | Post Round'],
  ] as const

  for (const [file, title] of pages) {
    const source = read(file)
    assert.match(source, /export const metadata/)
    assert.ok(source.includes(`title: '${title}'`))
    assert.match(source, /description: '[^']+'/)
  }
})

test('privacy and terms use a fixed date and clickable support contact', () => {
  for (const file of ['privacy/page.tsx', 'terms/page.tsx']) {
    const source = read(file)
    assert.ok(source.includes('Last Updated: September 19, 2026'))
    assert.ok(source.includes('mailto:support@postroundcoach.com'))
    assert.ok(source.includes('href="/delete-account"'))
  }
})

test('support contains contact, deletion, purchase, and credential guidance', () => {
  const source = read('support/page.tsx')
  assert.ok(source.includes('mailto:support@postroundcoach.com'))
  assert.ok(source.includes('href="/delete-account"'))
  assert.match(source, /restor(?:e|ing) purchases/i)
  assert.ok(source.includes('Never send us your password'))
  assert.ok(source.includes('Apple App Store subscription'))
})

test('marketing navigation and footer expose required destinations once', () => {
  const home = read('page.tsx')
  const footer = fs.readFileSync(path.join(appDir, '../components/Footer.tsx'), 'utf8')
  assert.ok(home.includes("['Support', '/support']"))
  for (const href of ['/privacy', '/terms', '/delete-account']) {
    assert.equal((footer.match(new RegExp(`href="${href}"`, 'g')) ?? []).length, 1)
  }
})

test('account deletion entry points and confirmation flow remain present', () => {
  const page = read('delete-account/page.tsx')
  const client = read('delete-account/DeleteAccountClient.tsx')
  assert.ok(page.includes('<DeleteAccountClient />'))
  assert.ok(client.includes('href="/login?next=/delete-account"'))
  assert.ok(client.includes("confirmationText !== 'DELETE'"))
  assert.ok(client.includes('requestAccountDeletion(session.access_token)'))
  assert.ok(client.includes('supabase.auth.signOut()'))
})