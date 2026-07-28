'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut } from 'lucide-react'

interface SignOutButtonProps {
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gold'
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon'
  children?: React.ReactNode
}

export function SignOutButton({ 
  className, 
  variant = 'ghost', 
  size = 'default',
  children 
}: SignOutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)

    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }

    router.push('/login')
    router.refresh()
  }

  return (
    <Button
      onClick={handleSignOut}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          {children || 'Sign Out'}
        </>
      )}
    </Button>
  )
}
