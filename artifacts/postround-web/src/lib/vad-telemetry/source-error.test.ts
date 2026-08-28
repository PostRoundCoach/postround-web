import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyVadSourceError } from './source-error.ts'

test('classifies a missing telemetry table separately', () => {
  assert.equal(classifyVadSourceError({ code: '42P01', message: 'relation not found' }).message, 'VAD telemetry table is not installed in the configured Supabase project')
  assert.equal(
    classifyVadSourceError({ code: 'PGRST205', message: 'table not found in schema cache' }).message,
    'VAD telemetry table is not installed in the configured Supabase project'
  )
})

test('classifies incompatible columns without calling the source missing', () => {
  assert.match(
    classifyVadSourceError({ code: '42703', message: 'column session_id does not exist' }).message,
    /schema is incompatible/
  )
})

test('does not expose provider errors as a healthy empty dataset', () => {
  assert.match(
    classifyVadSourceError({ code: 'PGRST301', message: 'JWT expired' }).message,
    /source query failed/
  )
})