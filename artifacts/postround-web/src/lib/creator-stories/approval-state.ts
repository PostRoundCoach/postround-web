import type { StoryPermissionStatus, StoryPermissionTimestamps } from './contracts'

// Detail permissionState="granted" represents the authenticated server's
// permission_granted=true check. Share with Creator needs no second approval.
export function permissionStatusFromDetail(
  permission: StoryPermissionTimestamps,
): StoryPermissionStatus | 'unknown' {
  if (permission.revoked_at !== null) return 'unknown'
  if (permission.granted_at) return 'approved'
  if (permission.approval_requested_at) return 'requested'
  return 'pending'
}
