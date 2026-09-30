import {
  LayoutDashboard,
  Settings,
  Sparkles,
  UserCircle,
} from 'lucide-react'

const playerNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/profile', icon: UserCircle, label: 'Profile' },
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