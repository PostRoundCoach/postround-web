'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { CreatorProfile } from '@/lib/creator-stories/contracts'

export function CreatorShell({
  children,
  profile,
}: {
  children: React.ReactNode
  profile: CreatorProfile | null
}) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to dashboard"
              data-testid="link-back-dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
              <span className="font-serif text-sm font-bold text-accent-foreground">PRC</span>
            </div>
            <div>
              <p className="font-serif text-lg font-bold leading-none">Creator Studio</p>
              <p className="mt-1 hidden text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
                Post Round Coach
              </p>
            </div>
          </div>

          {profile && (
            <div className="flex items-center gap-3" data-testid="profile-creator">
              <span className="hidden text-sm font-medium text-muted-foreground sm:block">
                {profile.display_name}
              </span>
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage
                  src={profile.avatar_url ?? undefined}
                  alt={profile.display_name}
                />
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {children}
      </main>
    </div>
  )
}
