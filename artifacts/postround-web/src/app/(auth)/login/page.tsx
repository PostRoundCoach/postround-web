'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  if (!supabase) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
          <p className="text-sm text-destructive">
            Authentication service unavailable. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsLoading(false)

    if (signInError) {
      if (
        signInError.message.toLowerCase().includes('invalid login') ||
        signInError.message.toLowerCase().includes('invalid credentials') ||
        signInError.status === 400
      ) {
        setError('Incorrect email or password. Please try again.')
      } else {
        setError(signInError.message)
      }
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-[#1B5E35]/30 border border-[#1B5E35]/50 flex items-center justify-center">
            <Mail className="h-5 w-5 text-[#52B788]" />
          </div>
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-1 text-center">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          Sign in to your Post Round Coach account
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-11"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#D4AF37] hover:text-[#C19F27] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-11 pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#D4AF37] hover:text-[#C19F27] font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
