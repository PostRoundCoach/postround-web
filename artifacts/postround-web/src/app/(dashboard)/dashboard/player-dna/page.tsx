import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dna } from 'lucide-react'

export default function PlayerDNAPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
          Player DNA
        </h1>
        <p className="text-muted-foreground">
          Your unique patterns and tendencies on the course
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Your Player DNA</CardTitle>
          <CardDescription>
            Discover patterns in your game across rounds, courses, and conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Dna className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Building your DNA</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your Player DNA will reveal itself as you log more rounds. We'll identify your strengths, 
              weaknesses, and unique patterns to help you improve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
