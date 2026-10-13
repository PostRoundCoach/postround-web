import assert from 'node:assert/strict'
import test from 'node:test'
import { permissionStatusFromDetail } from './approval-state.ts'

test('Share with Creator grants are already approved without a request timestamp', () => {
  assert.equal(permissionStatusFromDetail({
    granted_at: '2026-01-01T00:00:00Z', approval_requested_at: null, revoked_at: null,
  }), 'approved')
  assert.equal(permissionStatusFromDetail({
    granted_at: null, approval_requested_at: null, revoked_at: null,
  }), 'pending')
  assert.equal(permissionStatusFromDetail({
    granted_at: null, approval_requested_at: '2026-01-02T00:00:00Z', revoked_at: null,
  }), 'requested')
  assert.equal(permissionStatusFromDetail({
    granted_at: '2026-01-03T00:00:00Z', approval_requested_at: '2026-01-02T00:00:00Z', revoked_at: null,
  }), 'approved')
  assert.equal(permissionStatusFromDetail({
    granted_at: '2026-01-03T00:00:00Z', approval_requested_at: '2026-01-02T00:00:00Z',
    revoked_at: '2026-01-04T00:00:00Z',
  }), 'unknown')
})
