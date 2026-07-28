'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, KeyRound } from 'lucide-react'

type Step = 'email' | 'code'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
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

  const handleSendCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    setIsLoading(false)

    if (otpError) {
      // "Email not confirmed" means account doesn't exist — guide to signup
      if (otpError.message.toLowerCase().includes('not found') || otpError.status === 400) {
        setError("No account found for this email. Please sign up first.")
      } else {
        setError(otpError.message)
      }
      return
    }

    setStep('code')
  }

  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })

    setIsLoading(false)

    if (verifyError) {
      setError('Invalid or expired code. Please try again.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="p-8">
      {step === 'email' ? (
        <>
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
              Enter your email and we&apos;ll send you a 6-digit sign-in code
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSendCode} className="space-y-4">
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

            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending code...</>
              ) : (
                'Send Sign-In Code'
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
        </>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-[#1B5E35]/30 border border-[#1B5E35]/50 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-[#52B788]" />
              </div>
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-1 text-center">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              We sent a 6-digit code to{' '}
              <span className="text-foreground font-medium">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={isLoading}
                className="h-14 text-center text-2xl font-mono tracking-[0.5em]"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(null) }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Use a different email
            </button>
          </div>
        </>
      )}
    </div>
  )
}
