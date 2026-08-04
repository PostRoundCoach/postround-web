'use client'

import { useState, useMemo, useTransition } from 'react'
import { toast } from 'sonner'
import { Search, Shield, User, GraduationCap, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

export type UserRow = {
  id: string
  email: string
  displayName: string
  role: string
  createdAt: string
  lastSignIn: string | null
}

interface UserManagementProps {
  initialUsers: UserRow[]
  currentUserId: string
}

type RoleFilter = 'all' | 'admin' | 'coach' | 'user'

const PAGE_SIZE = 25

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
        Admin
      </Badge>
    )
  }
  if (role === 'coach') {
    return (
      <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
        Coach
      </Badge>
    )
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-border gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />
      User
    </Badge>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function UserManagement({ initialUsers, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [page, setPage] = useState(1)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    userId: string
    displayName: string
    newRole: 'admin' | 'user'
  } | null>(null)

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesSearch =
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      return matchesRole && matchesSearch
    })
  }, [users, search, roleFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset to page 1 on filter/search change
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }
  const handleRoleFilter = (v: RoleFilter) => { setRoleFilter(v); setPage(1) }

  // ── Role change ───────────────────────────────────────────────────────────
  function requestRoleChange(userId: string, displayName: string, newRole: 'admin' | 'user') {
    setPendingAction({ userId, displayName, newRole })
    setConfirmOpen(true)
  }

  async function confirmRoleChange() {
    if (!pendingAction) return
    const { userId, newRole } = pendingAction
    setConfirmOpen(false)
    setLoadingId(userId)

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        })

        const json = (await res.json()) as { error?: string; role?: string }

        if (!res.ok) {
          toast.error(json.error ?? 'Failed to update role')
        } else {
          // Update local state — only the affected row changes
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
          )
          toast.success(
            newRole === 'admin'
              ? 'Administrator permissions granted.'
              : 'Administrator access removed.'
          )
        }
      } catch {
        toast.error('Network error — please try again')
      } finally {
        setLoadingId(null)
        setPendingAction(null)
      }
    })
  }

  // ── Counts for filter labels ──────────────────────────────────────────────
  const counts = useMemo(() => {
    const all = users.length
    const admin = users.filter((u) => u.role === 'admin').length
    const coach = users.filter((u) => u.role === 'coach').length
    const user = users.filter((u) => u.role === 'user').length
    return { all, admin, coach, user }
  }, [users])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={(v) => handleRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users ({counts.all})</SelectItem>
            <SelectItem value="admin">Admins ({counts.admin})</SelectItem>
            <SelectItem value="coach">Coaches ({counts.coach})</SelectItem>
            <SelectItem value="user">Standard Users ({counts.user})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Joined
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Last Sign In
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No users match your search.
                  </td>
                </tr>
              ) : (
                pageUsers.map((u) => {
                  const isSelf = u.id === currentUserId
                  const isLoading = loadingId === u.id

                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {u.role === 'admin' ? (
                              <Shield className="h-4 w-4 text-emerald-400" />
                            ) : u.role === 'coach' ? (
                              <GraduationCap className="h-4 w-4 text-blue-400" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {u.displayName}
                              {isSelf && (
                                <span className="ml-2 text-xs text-[#D4AF37] font-normal">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Last Sign In */}
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {u.lastSignIn ? formatDate(u.lastSignIn) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground italic">Current User</span>
                        ) : isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
                        ) : u.role === 'user' || u.role === 'coach' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-300"
                            onClick={() => requestRoleChange(u.id, u.displayName, 'admin')}
                          >
                            Promote to Admin
                          </Button>
                        ) : u.role === 'admin' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600/40 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                            onClick={() => requestRoleChange(u.id, u.displayName, 'user')}
                          >
                            Remove Admin
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            {roleFilter !== 'all' || search ? ' matching filters' : ' total'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.newRole === 'admin'
                ? `Promote ${pendingAction.displayName} to Administrator?`
                : `Remove administrator access from ${pendingAction?.displayName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.newRole === 'admin'
                ? 'Administrators can access all admin features including user management and content tools.'
                : 'They will immediately lose access to the admin dashboard.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              className={cn(
                pendingAction?.newRole === 'admin'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-destructive hover:bg-destructive/90'
              )}
            >
              {pendingAction?.newRole === 'admin' ? 'Promote' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
