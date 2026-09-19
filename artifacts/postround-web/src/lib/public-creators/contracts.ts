export const CREATOR_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface PublicCreatorSocialAccount {
  platform: string
  handle: string
  profileUrl: string
}

export interface PublicCreator {
  displayName: string
  bio: string | null
  avatarUrl: string | null
  socialAccounts: PublicCreatorSocialAccount[]
}

export interface PublicCreatorRow {
  display_name: string
  bio: string | null
  avatar_url: string | null
  creator_social_accounts: Array<{
    platform: string
    handle: string
    profile_url: string | null
  }> | null
}

export function isValidCreatorSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 64 && CREATOR_SLUG_PATTERN.test(slug)
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function toPublicCreator(row: PublicCreatorRow): PublicCreator {
  return {
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: safeHttpUrl(row.avatar_url),
    socialAccounts: (row.creator_social_accounts ?? []).flatMap((account) => {
      const profileUrl = safeHttpUrl(account.profile_url)
      return profileUrl
        ? [{
            platform: account.platform,
            handle: account.handle,
            profileUrl,
          }]
        : []
    }),
  }
}

export function creatorDescription(creator: PublicCreator): string {
  const bio = creator.bio?.trim()
  if (bio) return bio.length <= 160 ? bio : `${bio.slice(0, 157).trimEnd()}...`
  return `Meet ${creator.displayName} on Post Round and follow their golf beyond the scorecard.`
}