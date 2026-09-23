import {
  CreditCard,
  Dna,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  TrendingUp,
  UserCircle,
} from 'lucide-react'

const playerNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/rounds', icon: TrendingUp, label: 'My Rounds' },
  { href: '/dashboard/coaching', icon: FileText, label: 'Coaching Reports' },
  { href: '/dashboard/player-dna', icon: Dna, label: 'Player DNA' },
  { href: '/dashboard/profile', icon: UserCircle, label: 'Profile' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

const creatorNavItem = {
  href: '/creator',
  icon: Sparkles,
  label: 'Creator Studio',
}

export function getDashboardNavItems(hasCreatorProfile: boolean) {
  if (!hasCreatorProfile) return playerNavItems

  return [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Creator Dashboard' },
    creatorNavItem,
    { href: '/dashboard/profile', icon: UserCircle, label: 'Profile' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]
}