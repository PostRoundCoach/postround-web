import assert from 'node:assert/strict'
import test from 'node:test'

import { validateProductionApiOrigin } from './validate-production-api-origin.mjs'

test('requires a separate authoritative API origin for Vercel production', () => {
  assert.throws(
    () => validateProductionApiOrigin({ VERCEL_ENV: 'production' }),
    /NEXT_PUBLIC_POSTROUND_API_BASE_URL is required/,
  )

  assert.throws(
    () => validateProductionApiOrigin({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_POSTROUND_API_BASE_URL: 'https://postroundcoach.com',
      NEXT_PUBLIC_SITE_URL: 'https://postroundcoach.com',
    }),
    /not the Next\.js site/,
  )
})

test('requires API routing for every production build', () => {
  assert.throws(
    () => validateProductionApiOrigin({ NODE_ENV: 'production' }),
    /NEXT_PUBLIC_POSTROUND_API_BASE_URL is required/,
  )
})

test('rejects the Vercel production site origin when the public site variable is absent', () => {
  assert.throws(
    () => validateProductionApiOrigin({
      NODE_ENV: 'production',
      NEXT_PUBLIC_POSTROUND_API_BASE_URL: 'https://postroundcoach.com',
      VERCEL_PROJECT_PRODUCTION_URL: 'postroundcoach.com',
    }),
    /not the Next\.js site/,
  )
})

test('accepts the deployed authoritative API origin for Vercel production', () => {
  assert.doesNotThrow(() => validateProductionApiOrigin({
    VERCEL_ENV: 'production',
    NEXT_PUBLIC_POSTROUND_API_BASE_URL: 'https://postroundcoach-web.replit.app/',
    NEXT_PUBLIC_SITE_URL: 'https://postroundcoach.com',
  }))
})

test('does not require production configuration during local development', () => {
  assert.doesNotThrow(() => validateProductionApiOrigin({ NODE_ENV: 'development' }))
})