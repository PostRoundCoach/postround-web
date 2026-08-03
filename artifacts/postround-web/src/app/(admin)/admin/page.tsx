import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, BarChart2, Cpu } from 'lucide-react'

const placeholderCards = [
  { title: 'Users', icon: Users, description: 'Manage registered users and their accounts.' },
  { title: 'Content', icon: FileText, description: 'AI-generated content ideas across all rounds.' },
  { title: 'Analytics', icon: BarChart2, description: 'Usage metrics, retention, and growth data.' },
  { title: 'AI Usage', icon: Cpu, description: 'Token usage, cost tracking, and model performance.' },
]

export default function AdminDashboardPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Welcome back</h1>
        <p className="text-muted-foreground">Post Round Coach admin portal</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {placeholderCards.map(({ title, icon: Icon, description }) => (
          <Card key={title}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#1B5E35]/20 border border-[#1B5E35]/30 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[#52B788]" />
                </div>
                <CardTitle className="font-serif text-base">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">{description}</p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                <span className="text-xs text-muted-foreground font-medium">Coming Soon</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
