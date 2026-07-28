import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'

export default function RoundsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
          My Rounds
        </h1>
        <p className="text-muted-foreground">
          Track and analyze your golf rounds
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Round History</CardTitle>
          <CardDescription>All your recorded rounds will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No rounds yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Start logging your rounds to get AI-powered coaching insights and build your Player DNA.
            </p>
            <Button variant="gold" size="lg" disabled>
              Log Your First Round
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
