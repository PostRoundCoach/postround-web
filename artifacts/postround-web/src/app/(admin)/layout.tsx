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
  // Do not render protected content or attempt auth against an unconfigured
  // project. The preview should explain how to repair its configuration.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div role="alert" className="max-w-lg rounded-lg border border-border bg-card p-8">
          <h1 className="text-xl font-semibold">Admin sign-in is unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This preview needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
            for the same Supabase project used by server-side access. Configure the
            public project URL and the anon key through the workspace environment
            and secrets settings, then restart the web preview.
          </p>
        </div>
      </main>
    )
  }

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
