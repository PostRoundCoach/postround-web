'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { 
  LayoutDashboard, 
  TrendingUp, 
  FileText, 
  Dna, 
  UserCircle, 
  CreditCard, 
  Settings, 
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface DashboardShellProps {
  children: React.ReactNode
  user: User
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/rounds', icon: TrendingUp, label: 'My Rounds' },
  { href: '/dashboard/coaching', icon: FileText, label: 'Coaching Reports' },
  { href: '/dashboard/player-dna', icon: Dna, label: 'Player DNA' },
  { href: '/dashboard/profile', icon: UserCircle, label: 'Profile' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full bg-[#0D1B12] border-r border-border">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#D4AF37] flex items-center justify-center">
            <span className="font-serif font-bold text-[#0D1B12] text-lg">PRC</span>
          </div>
          <div>
            <h2 className="font-serif font-bold text-white text-sm">Post Round Coach</h2>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                  : 'text-gray-300 hover:bg-[#1B5E35]/20 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <SignOutButton 
          variant="ghost" 
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-[#1B5E35]/20"
        />
      </div>
    </div>
  )
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 fixed left-0 top-0 bottom-0">
        <Sidebar pathname={pathname} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <Sidebar pathname={pathname} />
                </SheetContent>
              </Sheet>
              
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#D4AF37] flex items-center justify-center">
                  <span className="font-serif font-bold text-[#0D1B12] text-sm">PRC</span>
                </div>
                <span className="font-serif font-bold text-sm">Post Round Coach</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[100dvh] lg:min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
