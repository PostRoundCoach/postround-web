import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/admin/AdminShell'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Role-based access control: only users with app_metadata.role === 'admin' may access /admin
  if (user.app_metadata?.role !== 'admin') {
    redirect('/dashboard?error=admin_required')
  }

  return (
    <>
      <AdminShell user={user}>{children}</AdminShell>
      <Toaster richColors position="bottom-right" />
    </>
  )
}
