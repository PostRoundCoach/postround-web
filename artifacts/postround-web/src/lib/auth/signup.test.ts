import assert from 'node:assert/strict'
import test from 'node:test'
import { passwordError, verifiedSignupUser, signupRequestError } from './signup.ts'

test('password validation rejects short, incomplete and mismatched values without trimming', () => {
  for (const password of ['short1', 'onlyletters', '123456789']) {
    assert.ok(passwordError(password, password))
  }
  assert.match(passwordError('Password9', 'Different9')!, /do not match/)
  assert.equal(passwordError('  Password9  ', '  Password9  '), null)
})

test('completion requires confirmed matching identity, never session existence alone', () => {
  assert.equal(verifiedSignupUser(null, 'a@example.test'), false)
  assert.equal(verifiedSignupUser({ id: 'id', email: 'a@example.test' }, 'a@example.test'), false)
  const user = { id: 'id', email: 'a@example.test', email_confirmed_at: '2026-01-01' }
  assert.equal(verifiedSignupUser(user, ' A@EXAMPLE.TEST '), true)
  assert.equal(verifiedSignupUser(user, 'b@example.test'), false)
})

test('errors are actionable without leaking raw backend messages or claiming password replacement', () => {
  assert.match(signupRequestError({ status: 429 }), /wait/)
  assert.match(signupRequestError({ code: 'weak_password' }), /stronger password/)
  assert.match(signupRequestError({ code: 'user_already_exists' }), /does not replace/)
  assert.doesNotMatch(signupRequestError({ message: 'Secret diagnostic', status: 503 }), /Secret/)
})
