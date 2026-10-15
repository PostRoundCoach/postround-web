import assert from 'node:assert/strict'
import test from 'node:test'
import { clearDeletedAccountSession, navigateAfterDeletion } from './post-success.ts'

test('SDK cleanup success, returned errors and thrown errors are distinct from deletion', async () => {
  assert.equal(await clearDeletedAccountSession(async () => ({ error: null })), true)
  assert.equal(await clearDeletedAccountSession(async () => ({ error: new Error('fixture returned error') })), false)
  assert.equal(await clearDeletedAccountSession(async () => { throw new Error('fixture throw') }), false)
})

test('post-deletion navigation handles synchronous throws and rejected promises', async () => {
  assert.equal(await navigateAfterDeletion(() => {}), true)
  assert.equal(await navigateAfterDeletion(async () => {}), true)
  assert.equal(await navigateAfterDeletion(() => { throw new Error('fixture throw') }), false)
  assert.equal(await navigateAfterDeletion(async () => { throw new Error('fixture rejection') }), false)
})
