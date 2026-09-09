export function validateProductionApiOrigin(env = process.env) {
  const isProductionBuild =
    env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production'
  if (!isProductionBuild) return

  const rawApiOrigin = env.NEXT_PUBLIC_POSTROUND_API_BASE_URL?.trim()
  if (!rawApiOrigin) {
    throw new Error(
      'NEXT_PUBLIC_POSTROUND_API_BASE_URL is required for Vercel production builds.',
    )
  }

  let apiUrl
  try {
    apiUrl = new URL(rawApiOrigin)
  } catch {
    throw new Error(
      'NEXT_PUBLIC_POSTROUND_API_BASE_URL must be an absolute HTTPS origin.',
    )
  }

  if (
    apiUrl.protocol !== 'https:' ||
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.search ||
    apiUrl.hash ||
    (apiUrl.pathname !== '/' && apiUrl.pathname !== '')
  ) {
    throw new Error(
      'NEXT_PUBLIC_POSTROUND_API_BASE_URL must be an absolute HTTPS origin without a path, query, or credentials.',
    )
  }

  const rawSiteUrl = env.NEXT_PUBLIC_SITE_URL?.trim()
    || (
      env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
        : ''
    )
  if (!rawSiteUrl) {
    throw new Error(
      'A production web origin is required through NEXT_PUBLIC_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL.',
    )
  }

  let siteOrigin
  try {
    siteOrigin = new URL(rawSiteUrl).origin
  } catch {
    throw new Error('The production web origin must be an absolute URL.')
  }

  if (apiUrl.origin === siteOrigin) {
    throw new Error(
      'NEXT_PUBLIC_POSTROUND_API_BASE_URL must target the authoritative API Server, not the Next.js site.',
    )
  }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  validateProductionApiOrigin()
}