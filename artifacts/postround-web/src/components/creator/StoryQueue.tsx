'use client'

import { useState } from 'react'
import { Inbox, Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CreatorProfile, CreatorStory } from '@/lib/creator-stories/contracts'
import { filterStoryQueue, type StoryDateRange } from '@/lib/creator-stories/queue-filters'
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
  const [minimumSignificance, setMinimumSignificance] = useState(70)
  const [dateRange, setDateRange] = useState<StoryDateRange>('7')
  const visibleStories = filterStoryQueue(stories, minimumSignificance, dateRange)

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
              <Badge key={account.id} variant="secondary" className="max-w-full whitespace-normal break-all">
                <span className="capitalize">{account.platform}</span>
                <span className="ml-1 text-muted-foreground">@{account.handle}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-end" data-testid="story-queue-filters">
        <div className="w-full max-w-xs space-y-2">
          <label htmlFor="story-minimum-significance" className="block text-sm font-medium">
            Minimum significance: <output htmlFor="story-minimum-significance">{minimumSignificance}</output>
          </label>
          <input
            id="story-minimum-significance"
            type="range"
            min={60}
            max={90}
            step={10}
            value={minimumSignificance}
            onChange={(event) => setMinimumSignificance(Number(event.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
            {[60, 70, 80, 90].map((value) => <span key={value}>{value}</span>)}
          </div>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <label htmlFor="story-date-range" className="block text-sm font-medium">Created within</label>
          <select
            id="story-date-range"
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value as StoryDateRange)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
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
      ) : visibleStories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center" data-testid="status-story-queue-filtered-empty">
          <h2 className="font-serif text-2xl font-semibold">No stories match these filters</h2>
          <p className="mt-2 text-muted-foreground">Try a lower significance or a longer date range to see more shared stories.</p>
        </div>
      ) : (
        <div className="grid gap-6" data-testid="list-permissioned-stories">
          {visibleStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onDismissed={onStoryDismissed}
            />
          ))}
        </div>
      )}
    </div>
  )
}
