import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for use in browser (Client Components).
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env.
 * Add these to your .env.local (and to Vercel environment variables).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a no-op client stub during development before env vars are set
    console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return null
  }

  return createBrowserClient(url, key)
}
