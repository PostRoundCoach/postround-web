import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { CalendarDays, TrendingUp, Dna, FileText, Crown } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your golf game
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
            </div>
          </CardContent>
        </Card>

        {/* Recent Rounds Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#52B788]" />
              <CardTitle className="font-serif text-xl">Recent Rounds</CardTitle>
            </div>
            <CardDescription>Track your performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No rounds yet. Start your first round review.
              </p>
              <Button variant="outline" size="sm" disabled>
                Log a Round
              </Button>
            </div>
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
                Your DNA is building. Complete a round review to see your patterns.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Coaching Reports Card */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#52B788]" />
              <CardTitle className="font-serif text-xl">AI Coaching Reports</CardTitle>
            </div>
            <CardDescription>Personalized insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No coaching reports yet.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#D4AF37]" />
              <CardTitle className="font-serif text-xl">Subscription Status</CardTitle>
            </div>
            <CardDescription>Manage your plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border mb-2">
                  <span className="text-sm font-medium">Free Plan</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upgrade to unlock full AI coaching, unlimited rounds, and advanced Player DNA insights.
                </p>
              </div>
              <Button variant="gold" size="lg" disabled className="shrink-0">
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Getting Started</CardTitle>
          <CardDescription>Build your Player DNA and unlock AI coaching</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="h-8 w-8 rounded-full bg-[#52B788]/10 border border-[#52B788]/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#52B788]">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Log Your First Round</h4>
                <p className="text-xs text-muted-foreground">
                  Record your round details and scores
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="h-8 w-8 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#D4AF37]">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Get AI Coaching</h4>
                <p className="text-xs text-muted-foreground">
                  Receive personalized insights and tips
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="h-8 w-8 rounded-full bg-[#52B788]/10 border border-[#52B788]/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#52B788]">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Build Your DNA</h4>
                <p className="text-xs text-muted-foreground">
                  Track patterns and improve over time
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
