import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchOwnedActiveCreatorProfile } from './client'

// Shared across the dashboard layout and landing page within one server render.
export const getDashboardCreatorProfile = cache(async () => {
  const supabase = await createClient()
  try {
    return await fetchOwnedActiveCreatorProfile(supabase)
  } catch {
    return null
  }
})