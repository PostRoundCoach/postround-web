export type ReferralPlatform = 'web' | 'android' | 'ios'

export function referralPlatform(userAgent: string): ReferralPlatform {
  if (/android/i.test(userAgent)) return 'android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  return 'web'
}

function storeUrl(value: string | undefined, host: string): URL | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && url.hostname === host && !url.username && !url.password) return url
  } catch { /* Invalid configuration falls back to the web journey. */ }
  return null
}

export function referralDestination(platform: ReferralPlatform, evidence: string): string {
  if (platform === 'android') {
    const url = storeUrl(process.env.ANDROID_STORE_URL, 'play.google.com')
    if (url && url.pathname === '/store/apps/details' && url.searchParams.has('id')) {
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