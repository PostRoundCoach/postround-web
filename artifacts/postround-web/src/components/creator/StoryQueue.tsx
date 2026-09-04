'use client'

import { Inbox, Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CreatorProfile, CreatorStory } from '@/lib/creator-stories/contracts'
import { StoryCard } from './StoryCard'

export function StoryQueue({
  stories,
  profile,
  onStoryDismissed,
}: {
  stories: CreatorStory[]
  profile: CreatorProfile
  onStoryDismissed: (storyId: string) => void
}) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Radio className="h-3.5 w-3.5" />
            Follower stories
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Stories shared with you
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Review follower-approved moments and turn them into social content.
          </p>
        </div>

        {profile.creator_social_accounts.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            data-testid="list-creator-social-accounts"
          >
            {profile.creator_social_accounts.map((account) => (
              <Badge key={account.id} variant="secondary">
                <span className="capitalize">{account.platform}</span>
                <span className="ml-1 text-muted-foreground">@{account.handle}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {stories.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-20 text-center"
          data-testid="status-story-queue-empty"
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-2xl font-semibold">No follower stories yet</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            When a Post Round golfer shares an interesting story with you, it will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6" data-testid="list-permissioned-stories">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              creatorId={profile.id}
              onDismissed={onStoryDismissed}
            />
          ))}
        </div>
      )}
    </div>
  )
}
