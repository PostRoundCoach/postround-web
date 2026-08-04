import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { CalendarDays, TrendingUp, Dna, FileText, Crown, Flag } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

interface Round {
  id: string
  course_name: string | null
  played_at: string
  total_score: number | null
  course_par: number | null
  front_9: number | null
  back_9: number | null
  birdies: number | null
  total_putts: number | null
  ai_summary: string | null
}

function scoreDiff(score: number | null, par: number | null): string {
  if (score == null || par == null) return '—'
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function scoreDiffColor(score: number | null, par: number | null): string {
  if (score == null || par == null) return 'text-muted-foreground'
  const diff = score - par
  if (diff < 0) return 'text-[#52B788]'
  if (diff === 0) return 'text-[#D4AF37]'
  return 'text-muted-foreground'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error: errorParam } = await searchParams

  if (!user) return null

  // Fetch profile and recent rounds in parallel
  const [{ data: profile }, { data: rounds }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, avatar_url, created_at')
      .eq('id', user.id)
      .single<Profile>(),
    supabase
      .from('rounds')
      .select('id, course_name, played_at, total_score, course_par, front_9, back_9, birdies, total_putts, ai_summary')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(5),
  ])

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'Golfer'

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const memberSince = new Date(
    profile?.created_at ?? user.created_at
  ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const recentRounds: Round[] = rounds ?? []
  const roundCount = recentRounds.length

  // Best score across recent rounds
  const scored = recentRounds.filter(r => r.total_score != null && r.course_par != null)
  const bestRound = scored.length
    ? scored.reduce((best, r) =>
        (r.total_score! - r.course_par!) < (best.total_score! - best.course_par!) ? r : best
      )
    : null

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Admin access denied banner */}
      {errorParam === 'admin_required' && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="font-semibold">Access denied.</span>
          <span>You don&apos;t have permission to access the admin portal.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your golf game
          </p>
        </div>
        <div className="hidden sm:block">
          <SignOutButton variant="outline" />
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {/* Player Profile Card */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Player Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-20 w-20">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={displayName} />
                )}
                <AvatarFallback className="bg-[#D4AF37] text-[#0D1B12] text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{displayName}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  <span>Member since {memberSince}</span>
                </div>
              </div>
              {roundCount > 0 && (
                <div className="w-full grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{roundCount}</p>
                    <p className="text-xs text-muted-foreground">Rounds logged</p>
                  </div>
                  {bestRound && (
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${scoreDiffColor(bestRound.total_score, bestRound.course_par)}`}>
                        {scoreDiff(bestRound.total_score, bestRound.course_par)}
                      </p>
                      <p className="text-xs text-muted-foreground">Best score</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Rounds Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#52B788]" />
                <CardTitle className="font-serif text-xl">Recent Rounds</CardTitle>
              </div>
              {roundCount > 0 && (
                <Link href="/dashboard/rounds">
                  <Button variant="ghost" size="sm" className="text-[#D4AF37] hover:text-[#C19F27]">
                    View all
                  </Button>
                </Link>
              )}
            </div>
            <CardDescription>Your latest rounds from the app</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRounds.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Flag className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No rounds yet. Log your first round in the app.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentRounds.map((round) => (
                  <div key={round.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {round.course_name ?? 'Unknown course'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(round.played_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                        {round.total_putts != null && (
                          <span className="ml-2">{round.total_putts} putts</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      {round.total_score != null && (
                        <p className="font-bold text-lg leading-none">{round.total_score}</p>
                      )}
                      <p className={`text-xs font-medium ${scoreDiffColor(round.total_score, round.course_par)}`}>
                        {scoreDiff(round.total_score, round.course_par)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player DNA Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Dna className="h-5 w-5 text-[#D4AF37]" />
              <CardTitle className="font-serif text-xl">Player DNA</CardTitle>
            </div>
            <CardDescription>Your unique patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Dna className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {roundCount === 0
                  ? 'Complete a round review to see your patterns.'
                  : 'Full DNA analysis coming soon.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Coaching Reports Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#52B788]" />
              <CardTitle className="font-serif text-xl">AI Coaching Reports</CardTitle>
            </div>
            <CardDescription>Personalized insights</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRounds.some(r => r.ai_summary) ? (
              <div className="space-y-3">
                {recentRounds.filter(r => r.ai_summary).slice(0, 2).map(round => (
                  <div key={round.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {round.course_name} · {new Date(round.played_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-foreground line-clamp-3">{round.ai_summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {roundCount === 0 ? 'No coaching reports yet.' : 'No AI summaries on recent rounds.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Status Card */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#D4AF37]" />
              <CardTitle className="font-serif text-xl">Subscription</CardTitle>
            </div>
            <CardDescription>Manage your plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border mb-2">
                  <span className="text-sm font-medium">Free Plan</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upgrade to unlock full AI coaching, unlimited rounds, and advanced Player DNA insights.
                </p>
              </div>
              <Button variant="gold" size="lg" disabled className="w-full">
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
