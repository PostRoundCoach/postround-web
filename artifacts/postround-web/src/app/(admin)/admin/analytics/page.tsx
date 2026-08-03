import { Card, CardContent } from '@/components/ui/card'
import { BarChart2 } from 'lucide-react'

export default function AdminAnalyticsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Analytics</h1>
        <p className="text-muted-foreground">Usage metrics, retention, and growth data</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <BarChart2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-xl font-semibold mb-2">Coming Soon</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Engagement analytics, round submission trends, and AI coaching metrics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
