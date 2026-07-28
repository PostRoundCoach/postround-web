'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/api/auth/callback?next=/reset-password`,
    })

    setIsLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-[#1B5E35]/30 border border-[#1B5E35]/50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-[#52B788]" />
          </div>
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
          Check your inbox
        </h2>
        <p className="text-sm text-muted-foreground mb-1 max-w-xs mx-auto">
          We sent a password reset link to{' '}
          <span className="text-foreground font-medium">{email}</span>.
        </p>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          The link expires in 1 hour.
        </p>
        <Link href="/login" className="text-sm text-[#D4AF37] hover:text-[#C19F27] transition-colors">
          Back to sign in
        </Link>
      </div>
    )
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
          Forgot your password?
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-xs mx-auto">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoFocus
          />
        </div>

        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending reset link...</>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
