import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function CoachingPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
          Coaching Reports
        </h1>
        <p className="text-muted-foreground">
          AI-generated insights and recommendations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Your Coaching Reports</CardTitle>
          <CardDescription>Personalized AI coaching based on your rounds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No coaching reports yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Complete your first round to receive AI-powered coaching insights tailored to your game.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
