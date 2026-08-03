'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart2,
  Settings,
  Menu,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface AdminShellProps {
  children: React.ReactNode
  user: User
}

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/admin/content', icon: FileText, label: 'Content Studio', exact: false },
  { href: '/admin/users', icon: Users, label: 'Users', exact: false },
  { href: '/admin/analytics', icon: BarChart2, label: 'Analytics', exact: false },
  { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false },
]

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full bg-[#0A1510] border-r border-border">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#D4AF37] flex items-center justify-center shrink-0">
            <span className="font-serif font-bold text-[#0D1B12] text-lg">PRC</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-serif font-bold text-white text-sm truncate">Post Round Coach</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3 w-3 text-[#D4AF37]" />
              <span className="text-xs text-[#D4AF37] font-medium">Admin Portal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

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
              <Icon className="h-5 w-5 shrink-0" />
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

export function AdminShell({ children, user: _user }: AdminShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 fixed left-0 top-0 bottom-0 z-30">
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
                <div>
                  <span className="font-serif font-bold text-sm">Post Round Coach</span>
                  <span className="ml-2 text-xs text-[#D4AF37]">Admin</span>
                </div>
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
