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
  label: 'Creator Dashboard',
}

export function getDashboardNavItems(hasCreatorProfile: boolean) {
  if (!hasCreatorProfile) return playerNavItems

  const profileIndex = playerNavItems.findIndex((item) => item.href === '/dashboard/profile')
  return [
    ...playerNavItems.slice(0, profileIndex + 1),
    creatorNavItem,
    ...playerNavItems.slice(profileIndex + 1),
  ]
}