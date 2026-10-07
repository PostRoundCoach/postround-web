/** Web policy matches the existing recovery form; Supabase remains authoritative. */
export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters for your password.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Include at least one letter and one number.'
  }
  if (password !== confirmation) return 'Passwords do not match.'
  return null
}

export function verifiedSignupUser(
  user: { id: string; email?: string; email_confirmed_at?: string } | null,
  email: string,
): boolean {
  return Boolean(user?.id && user.email_confirmed_at &&
    user.email?.toLowerCase() === email.trim().toLowerCase())
}

export const EXISTING_ACCOUNT_HELP =
  'If you already have an account, sign in or recover access. This form does not replace an existing account’s password.'

export function signupRequestError(error: { code?: string; status?: number; message?: string }): string {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    return 'Please wait before requesting another email, then try again.'
  }
  if (error.code === 'weak_password') {
    return 'This password does not meet the account security requirements. Choose a stronger password and try again.'
  }
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return EXISTING_ACCOUNT_HELP
  }
  return 'We could not complete the request. Please try again. If you already signed up, resume verification or sign in.'
}
