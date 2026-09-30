import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayerSubscription } from '@/lib/subscription/server'
import { presentSubscription } from '@/lib/subscription/presentation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const plans = [
  { id: 'free', name: 'Free', description: 'Basic round capture and eligible AI activities, subject to your available balances.' },
  { id: 'player', name: 'Player', description: 'Player features and a monthly shared PR Credit allowance when subscribed.' },
  { id: 'performance', name: 'Performance', description: 'Player features and additional coaching and analytics, with a finite monthly shared PR Credit allowance when subscribed.' },
] as const

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const subscription = presentSubscription(await getPlayerSubscription(user.id))

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Billing &amp; Subscription</h1>
        <p className="text-muted-foreground">View your recorded subscription. Plan changes are not available here yet.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Your subscription</CardTitle>
          <CardDescription>Read from your signed-in account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Recorded plan: <strong>{subscription.plan}</strong></p>
          <p>Subscription status: <strong>{subscription.status}</strong></p>
          <p>{subscription.access}</p>
          <p>{subscription.reportBalance}</p>
          <p>Included PR Credits remaining: unavailable</p>
          <p>Purchased PR Credits remaining: unavailable</p>
          <p className="text-muted-foreground">
            Included PR Credits are shared across eligible AI activities. Purchased credits are separate
            and do not unlock paid-only features or replenish Free AI Round Reports.
            Remaining PR Credit balances cannot be confirmed on this page.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={subscription.knownPlan === plan.id ? 'border-2 border-primary' : ''}>
            <CardHeader>
              {subscription.knownPlan === plan.id && (
                <span className="text-xs font-medium text-primary">Recorded plan</span>
              )}
              <CardTitle className="font-serif text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {plan.id === 'free'
                  ? 'Lifetime included PR Credits and a separate lifetime AI Round Report balance. Allowances are unavailable.'
                  : 'Monthly included PR Credits and AI Round Report access depend on an active or trialing subscription. Allowances are unavailable.'}
              </p>
              {plan.id !== 'free' && <p className="text-sm text-muted-foreground">Live price and currency unavailable.</p>}
              <Button variant={plan.id === 'player' ? 'gold' : 'outline'} className="w-full" disabled>
                {subscription.knownPlan === plan.id ? 'Recorded Plan' : plan.id === 'free' ? 'Select Free' : `Upgrade to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Plan allowances and paid pricing are not shown until the deployed catalog and live pricing can be confirmed.
        No purchase or plan change is available on this page.
      </p>
    </div>
  )
}