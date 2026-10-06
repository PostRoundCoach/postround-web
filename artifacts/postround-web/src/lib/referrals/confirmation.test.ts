import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { androidStoreUrl, POST_ROUND_APP_URL, referralDestination } from './config.ts'
import { isReferralStatus, referralState } from './state.ts'

test('only stored attribution confirms success; evidence alone is pending or invalid', () => {
  assert.equal(referralState(false), 'absent')
  assert.equal(referralState(false, 'expired-or-malformed'), 'invalid')
  assert.equal(referralState(false, '90000000-0000-4000-8000-000000000001'), 'pending')
  for (const evidence of [undefined, 'invalid', '90000000-0000-4000-8000-000000000001']) {
    assert.equal(referralState(true, evidence), 'applied')
  }
  for (const value of ['claimed', 'none', true, null, { status: 'applied' }]) {
    assert.equal(isReferralStatus(value), false)
  }
  assert.equal(isReferralStatus('unavailable'), true)
})

test('only configured HTTPS Play details URL enables download; only store-first routing adds install evidence', () => {
  const old = process.env.ANDROID_STORE_URL
  try {
    for (const value of [
      '', 'invalid', 'http://play.google.com/store/apps/details?id=fixture',
      'https://evil.test/store/apps/details?id=fixture',
      'https://play.google.com/store/apps/details', 'https://play.google.com/store/apps/details?id=',
      'https://play.google.com/store/apps/details?id=%20',
      'https://user:password@play.google.com/store/apps/details?id=fixture',
      'https://play.google.com:444/store/apps/details?id=fixture',
      'https://play.google.com/other?id=fixture',
    ]) {
      process.env.ANDROID_STORE_URL = value
      assert.equal(androidStoreUrl(), null)
      assert.equal(referralDestination('android', 'event'), '/signup')
    }
    const valid = 'https://play.google.com/store/apps/details?id=test.fixture'
    process.env.ANDROID_STORE_URL = `${valid}&referrer=old-evidence`
    assert.equal(androidStoreUrl(), valid)
    const install = new URL(referralDestination('android', 'opaque-event'))
    assert.equal(install.searchParams.get('id'), 'test.fixture')
    assert.equal(new URLSearchParams(install.searchParams.get('referrer')!).get('pr_ref'), 'opaque-event')
    assert.equal(POST_ROUND_APP_URL, 'golf-coach://')
  } finally {
    if (old === undefined) delete process.env.ANDROID_STORE_URL
    else process.env.ANDROID_STORE_URL = old
  }
})

test('confirmation guards before constructing content and app CTAs contain no session or claims', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
  const page = read('../../app/(auth)/signup/complete/page.tsx')
  assert.ok(page.indexOf("redirect('/login')") < page.indexOf('return <SignupConfirmation'))
  const view = read('../../components/auth/SignupConfirmationView.tsx')
  assert.match(view, /href=\{POST_ROUND_APP_URL\}/)
  assert.doesNotMatch(view, /fetch\(|useEffect|access_token|refresh_token|location\.|intent:|referrals\/claim/)
  const client = read('../../components/auth/SignupConfirmation.tsx')
  assert.match(client, /MAX_RETRIES = 3/)
  assert.match(client, /mountedAttempt\.current/)
  const claim = read('./claim.ts')
  assert.ok(claim.indexOf('if (existing)') < claim.indexOf("supabase.rpc('claim_creator_referral'"))
  assert.match(claim, /if \(error\.code === '22023'\)/)
})
