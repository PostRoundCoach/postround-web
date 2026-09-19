import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  creatorDescription,
  isValidCreatorSlug,
  toPublicCreator,
} from './contracts.ts'

test('creator slugs accept only stable lowercase URL-safe values', () => {
  assert.equal(isValidCreatorSlug('creator-fixture'), true)
  assert.equal(isValidCreatorSlug('abc'), true)
  assert.equal(isValidCreatorSlug('Creator-Fixture'), false)
  assert.equal(isValidCreatorSlug('creator_fixture'), false)
  assert.equal(isValidCreatorSlug('-creator'), false)
  assert.equal(isValidCreatorSlug('ab'), false)
  assert.equal(isValidCreatorSlug('a'.repeat(65)), false)
})

test('slug migration preserves existing records and enforces assigned uniqueness', () => {
  const migration = readFileSync(
    new URL('../../../supabase/migrations/202609190001_public_creator_slugs.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /ADD COLUMN IF NOT EXISTS slug text/)
  assert.match(migration, /slug IS NULL/)
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS creator_profiles_slug_unique/)
  assert.match(migration, /WHERE slug IS NOT NULL/)
  assert.match(migration, /RETURNS TABLE \([\s\S]*display_name text,[\s\S]*bio text,[\s\S]*avatar_url text,[\s\S]*creator_social_accounts jsonb/)
  assert.match(migration, /SECURITY DEFINER/)
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_public_creator_by_slug\(text\) FROM PUBLIC/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_public_creator_by_slug\(text\) TO anon, authenticated/)
  assert.doesNotMatch(migration, /\bUPDATE\s+public\.creator_profiles\b/i)
})

test('public projection excludes private creator and account fields', () => {
  const migration = readFileSync(
    new URL('../../../supabase/migrations/202609190001_public_creator_slugs.sql', import.meta.url),
    'utf8',
  )
  const returnContract = migration.match(/RETURNS TABLE \(([\s\S]*?)\)\s*LANGUAGE/)?.[1] ?? ''

  assert.match(returnContract, /display_name/)
  assert.match(returnContract, /creator_social_accounts/)
  for (const privateField of ['id', 'user_id', 'status', 'created_at', 'updated_at']) {
    assert.doesNotMatch(returnContract, new RegExp(`\\b${privateField}\\b`))
  }
})

test('public mapping handles social variations and drops unsafe URLs', () => {
  const creator = toPublicCreator({
    display_name: 'Fixture Creator',
    bio: null,
    avatar_url: 'javascript:alert(1)',
    creator_social_accounts: [
      { platform: 'Instagram', handle: '@fixture', profile_url: 'https://instagram.com/fixture' },
      { platform: 'Other', handle: 'unsafe', profile_url: 'javascript:alert(1)' },
      { platform: 'Missing', handle: 'missing', profile_url: null },
    ],
  })

  assert.equal(creator.avatarUrl, null)
  assert.deepEqual(creator.socialAccounts, [{
    platform: 'Instagram',
    handle: '@fixture',
    profileUrl: 'https://instagram.com/fixture',
  }])
  assert.match(creatorDescription(creator), /Fixture Creator/)
})

test('creator descriptions are metadata-safe', () => {
  const description = creatorDescription({
    displayName: 'Fixture',
    bio: 'a'.repeat(200),
    avatarUrl: null,
    socialAccounts: [],
  })
  assert.equal(description.length, 160)
  assert.match(description, /\.\.\.$/)
})