import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { referralDestination, referralPlatform } from './config.ts'

const migration = readFileSync(
  new URL('../../../supabase/migrations/202609250001_creator_referrals.sql', import.meta.url), 'utf8',
)

test('platform destinations are configured centrally and unsafe values fall back', () => {
  const old = { android: process.env.ANDROID_STORE_URL, ios: process.env.IOS_STORE_URL, web: process.env.WEB_FALLBACK_PATH }
  try {
    delete process.env.ANDROID_STORE_URL
    delete process.env.IOS_STORE_URL
    delete process.env.WEB_FALLBACK_PATH
    assert.equal(referralDestination('android', 'evidence'), '/signup')
    assert.equal(referralPlatform('Mozilla Android'), 'android')
    assert.equal(referralPlatform('iPhone'), 'ios')
    process.env.ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.example.app'
    const play = new URL(referralDestination('android', 'evidence'))
    assert.equal(new URLSearchParams(play.searchParams.get('referrer')!).get('pr_ref'), 'evidence')
    process.env.ANDROID_STORE_URL = 'https://evil.test/store/apps/details?id=com.example.app'
    assert.equal(referralDestination('android', 'evidence'), '/signup')
    process.env.IOS_STORE_URL = 'https://apps.apple.com/us/app/example/id12345'
    assert.match(referralDestination('ios', 'evidence'), /^https:\/\/apps\.apple\.com\//)
    process.env.WEB_FALLBACK_PATH = '//evil.test'
    assert.equal(referralDestination('web', 'evidence'), '/signup')
  } finally {
    if (old.android === undefined) delete process.env.ANDROID_STORE_URL
    else process.env.ANDROID_STORE_URL = old.android
    if (old.ios === undefined) delete process.env.IOS_STORE_URL
    else process.env.IOS_STORE_URL = old.ios
    if (old.web === undefined) delete process.env.WEB_FALLBACK_PATH
    else process.env.WEB_FALLBACK_PATH = old.web
  }
})

test('schema confines writes to definer functions and one immutable attribution per user', () => {
  assert.match(migration, /creator_id uuid NOT NULL UNIQUE REFERENCES public\.creator_profiles\(id\)/)
  assert.match(migration, /user_id uuid NOT NULL UNIQUE REFERENCES public\.profiles\(id\)/)
  assert.match(migration, /referral_event_id uuid NOT NULL UNIQUE/)
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.creator_attributions/)
  assert.match(migration, /REVOKE ALL ON public\.creator_referral_links, public\.creator_referral_events, public\.creator_attributions FROM anon, authenticated/)
  assert.match(migration, /GRANT SELECT ON public\.creator_attributions TO authenticated/)
  assert.match(migration, /user_id = \(SELECT auth\.uid\(\)\)/)
  assert.match(migration, /ON CONFLICT DO NOTHING/)
  assert.match(migration, /e\.expires_at > now\(\) AND cp\.status = 'active'/)
  assert.match(migration, /claimant uuid := auth\.uid\(\)/)
  assert.doesNotMatch(migration, /INSERT INTO public\.profiles/)
})