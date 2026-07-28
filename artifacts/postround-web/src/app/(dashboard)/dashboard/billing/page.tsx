import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, Check } from 'lucide-react'

export default function BillingPage() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment methods
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Free Plan */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit mb-2">
              <span className="text-xs font-medium text-primary">Current Plan</span>
            </div>
            <CardTitle className="font-serif text-2xl">Free</CardTitle>
            <CardDescription className="text-2xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/month</span></CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>3 round reviews per month</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Basic AI insights</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Player DNA snapshot</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-2 border-[#D4AF37] relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#D4AF37] text-[#0D1B12] text-xs font-bold">
              <Crown className="h-3 w-3" />
              POPULAR
            </div>
          </div>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Pro</CardTitle>
            <CardDescription className="text-2xl font-bold">$19<span className="text-sm font-normal text-muted-foreground">/month</span></CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Unlimited round reviews</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Advanced AI coaching</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Full Player DNA analysis</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Performance trends</span>
              </li>
            </ul>
            <Button variant="gold" className="w-full" disabled>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>

        {/* Elite Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Elite</CardTitle>
            <CardDescription className="text-2xl font-bold">$49<span className="text-sm font-normal text-muted-foreground">/month</span></CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Everything in Pro</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>1-on-1 coaching sessions</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Custom training plans</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Priority support</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Upgrade to Elite
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Payment Method</CardTitle>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No payment method on file. Add a payment method when you upgrade.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
