import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicCreatorProfile } from '@/components/creator/PublicCreatorProfile'
import { creatorDescription, isValidCreatorSlug } from '@/lib/public-creators/contracts'
import { getPublicCreatorBySlug } from '@/lib/public-creators/server'

interface CreatorPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isValidCreatorSlug(slug)) return {}

  const creator = await getPublicCreatorBySlug(slug)
  if (!creator) return {}

  const title = `${creator.displayName} | Post Round`
  const description = creatorDescription(creator)
  const images = creator.avatarUrl
    ? [{ url: creator.avatarUrl, alt: `${creator.displayName} on Post Round` }]
    : undefined

  return {
    title,
    description,
    alternates: {
      canonical: `/creators/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `/creators/${slug}`,
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description,
      images,
    },
  }
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { slug } = await params
  if (!isValidCreatorSlug(slug)) notFound()

  const creator = await getPublicCreatorBySlug(slug)
  if (!creator) notFound()

  return <PublicCreatorProfile {...creator} />
}