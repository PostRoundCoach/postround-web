export type ReferralPlatform = 'web' | 'android' | 'ios'

/** Navigation only. Historical manual verification does not prove the current installed build. */
export const POST_ROUND_APP_URL = 'golf-coach://'

/** Distribution owner supplied this internal-testing fallback; access requires tester eligibility. */
export const ANDROID_INTERNAL_TEST_URL = 'https://play.google.com/apps/internaltest/4701664780036715121'

/** Confirmation only: internal testing is not a Play Install Referrer details listing. */
export function androidConfirmationStoreUrl(): string {
  return androidStoreUrl() ?? ANDROID_INTERNAL_TEST_URL
}

export function androidStoreUrl(): string | null {
  const url = storeUrl(process.env.ANDROID_STORE_URL, 'play.google.com')
  // Only /r issues install evidence. The plain download action carries none.
  url?.searchParams.delete('referrer')
  return url && url.pathname === '/store/apps/details' && url.searchParams.get('id')?.trim()
    ? url.toString() : null
}

export function referralPlatform(userAgent: string): ReferralPlatform {
  if (/android/i.test(userAgent)) return 'android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  return 'web'
}

function storeUrl(value: string | undefined, host: string): URL | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && url.hostname === host && !url.port && !url.username && !url.password) return url
  } catch { /* Invalid configuration falls back to the web journey. */ }
  return null
}

export function referralDestination(platform: ReferralPlatform, evidence: string): string {
  if (platform === 'android') {
    const configured = androidStoreUrl()
    const url = configured ? new URL(configured) : null
    if (url) {
      url.searchParams.set('referrer', new URLSearchParams({ pr_ref: evidence }).toString())
      return url.toString()
    }
  }
  if (platform === 'ios') {
    const url = storeUrl(process.env.IOS_STORE_URL, 'apps.apple.com')
    if (url && url.pathname.startsWith('/')) return url.toString()
  }
  const fallback = process.env.WEB_FALLBACK_PATH ?? '/signup'
  return fallback.startsWith('/') && !fallback.startsWith('//') && !fallback.includes('\\')
    ? fallback : '/signup'
}