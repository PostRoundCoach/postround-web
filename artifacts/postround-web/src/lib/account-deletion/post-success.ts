export const SESSION_CLEANUP_WARNING = 'Your account is deleted, but we could not finish clearing this browser session. Close this tab and clear site data for Post Round before using a shared device. Do not submit another deletion request.'
export const HOME_NAVIGATION_WARNING = 'Your account is still deleted. We could not open the home page. Use the Back to Home link below or close this tab.'

// Deliberately separate from requestAccountDeletion: nothing here can revoke
// an already validated deletion acknowledgment. Do not expose SDK error text.
export async function clearDeletedAccountSession(
  signOut: () => Promise<{ error: unknown }>,
): Promise<boolean> {
  try {
    const result = await signOut()
    return !result.error
  } catch {
    return false
  }
}

export async function navigateAfterDeletion(
  navigate: () => void | Promise<void>,
): Promise<boolean> {
  try {
    await navigate()
    return true
  } catch {
    return false
  }
}
