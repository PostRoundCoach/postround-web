import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  isValidCreatorSlug,
  toPublicCreator,
  type PublicCreator,
  type PublicCreatorRow,
} from './contracts'

export class PublicCreatorReadError extends Error {
  constructor() {
    super('The public creator profile could not be loaded.')
    this.name = 'PublicCreatorReadError'
  }
}

export async function getPublicCreatorBySlug(slug: string): Promise<PublicCreator | null> {
  if (!isValidCreatorSlug(slug)) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('get_public_creator_by_slug', { requested_slug: slug })
    .maybeSingle()

  if (error) throw new PublicCreatorReadError()
  return data ? toPublicCreator(data as PublicCreatorRow) : null
}