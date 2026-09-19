import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(__dirname, 'DeleteAccountClient.tsx')
const sourceCode = fs.readFileSync(sourcePath, 'utf-8')

test('DeleteAccountClient includes exact confirmation requirement', () => {
  // Should check that it specifically looks for "DELETE"
  assert.ok(
    sourceCode.includes("!acknowledged || confirmationText !== 'DELETE'"),
    'Component must strictly enforce "DELETE" confirmation string'
  )
  assert.ok(sourceCode.includes('checked={acknowledged}'))
})

test('DeleteAccountClient includes required subscription and data retention warnings', () => {
  assert.ok(
    sourceCode.includes('support.apple.com'),
    'Component must include Apple Support link for subscriptions'
  )
  assert.ok(
    sourceCode.includes('Apple App Store subscription'),
    'Component must explicitly mention Apple App Store subscription'
  )
  assert.ok(
    sourceCode.includes('audit records may be retained'),
    'Component must mention retention of audit/security records'
  )
})

test('DeleteAccountClient includes required support and privacy links', () => {
  assert.ok(
    sourceCode.includes('href="/privacy"'),
    'Component must include a link to the Privacy Policy'
  )
  assert.ok(
    sourceCode.includes('mailto:support@postroundcoach.com'),
    'Component must include a mailto link to support'
  )
})

test('DeleteAccountClient performs session cleanup on success', () => {
  assert.ok(
    sourceCode.includes('supabase.auth.signOut()'),
    'Component must sign the user out locally upon successful deletion'
  )
})
