'use client'

import { useEffect, useRef, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserPlus, KeyRound, Eye, EyeOff } from 'lucide-react'
import { passwordError, verifiedSignupUser, signupRequestError, EXISTING_ACCOUNT_HELP } from '@/lib/auth/signup'

type Step = 'details' | 'code'

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('details')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creatorReferred, setCreatorReferred] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmationBlocked, setConfirmationBlocked] = useState(false)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const locked = useRef(false)
  const pendingKey = 'postround-pending-signup'

  // Only resumable email/referral UI context is stored, never credentials or codes.
  useEffect(() => {
    try {
      const pending = JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null')
      if (pending && typeof pending.email === 'string') {
        setEmail(pending.email)
        setCreatorReferred(pending.referred === true)
        setResendAt(typeof pending.resendAt === 'number' ? pending.resendAt : 0)
        setConfirmationBlocked(pending.blocked === true)
        if (pending.blocked === true) {
          setError('Email confirmation is not enabled for signup. Signup cannot be completed here; please contact support.')
        }
        setStep('code')
      }
    } catch { /* Storage is optional; manual resume remains available. */ }
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const rememberPending = (referred: boolean, until: number, blocked = false) => {
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify({ email: email.trim(), referred, resendAt: until, blocked }))
    } catch { /* Manual resume is available when browser storage is disabled. */ }
  }

  const referralContext = async () => {
    try {
      const response = await fetch('/referrals/status', { cache: 'no-store', signal: AbortSignal.timeout(5_000) })
      const context = await response.json()
      if (context.hasPending === true) {
        setCreatorReferred(true)
        return true
      }
    } catch { /* Referral availability must not prevent account creation. */ }
    return creatorReferred
  }

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
    if (locked.current) return
    const validation = passwordError(password, confirmation)
    if (!displayName.trim() || validation) {
      setError(validation ?? 'Enter your display name.')
      return
    }
    locked.current = true
    setIsLoading(true)
    setError(null)
    const referred = await referralContext()
    // Remember intent before sending: a lost response must not cause another
    // signup/password submission after refresh. Recovery uses resend, not signUp.
    const until = Date.now() + 60_000
    rememberPending(referred, until)
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      })
      if (signupError) {
        setError(signupRequestError(signupError))
        // Definitive client errors did not create an account. Ambiguous network
        // failures keep the resumable intent so the next request never resets a password.
        if (signupError.status && signupError.status < 500) {
          try { sessionStorage.removeItem(pendingKey) } catch {}
          return
        }
      }
      // Confirmation must be enabled. Never accept an auto-confirmed session
      // as evidence of email verification in this funnel.
      if (data.session) {
        setConfirmationBlocked(true)
        rememberPending(referred, until, true)
        await supabase.auth.signOut()
        setError('Email confirmation is not enabled for signup. Signup cannot be completed here; please contact support.')
      } else if (data.user?.identities?.length === 0) {
        setError(EXISTING_ACCOUNT_HELP)
      }
      setResendAt(until)
      setStep('code')
    } catch {
      setError('The request was interrupted. Check your email or resend the signup confirmation. Do not create the account again.')
      setResendAt(until)
      setStep('code')
    } finally {
      setConfirmation('')
      locked.current = false
      setIsLoading(false)
    }
  }

  const finishVerified = async (referred: boolean) => {
    try { sessionStorage.removeItem(pendingKey) } catch {}
    if (referred) {
      router.push('/signup/complete')
      router.refresh()
      return
    }

    try {
      const claim = await fetch('/referrals/claim', { method: 'POST', signal: AbortSignal.timeout(10_000) })
      const outcome = await claim.json()
      // If a context read failed, the claim endpoint still captures the cookie
      // before clearing it. Its status is never used as attribution proof here.
      if (outcome.hasPending === true) {
        setIsLoading(false)
        router.push('/signup/complete')
        router.refresh()
        return
      }
      if (!claim.ok) {
        setIsLoading(false)
        router.push('/dashboard?referral=pending')
        router.refresh()
        return
      }
    } catch {
      setIsLoading(false)
      router.push('/dashboard?referral=pending')
      router.refresh()
      return
    }
    setIsLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (locked.current || code.length !== 6 || confirmationBlocked) return
    if (!password) {
      setError('Enter the password you chose when you started signup.')
      return
    }
    locked.current = true
    setIsLoading(true)
    setError(null)
    try {
      const referred = await referralContext()
      // A previous verification may have succeeded before its response was lost.
      const current = await supabase.auth.getUser()
      if (!current.error && verifiedSignupUser(current.data.user, email)) {
        await confirmCredentials(current.data.user!.id, referred)
        return
      }
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(), token: code.trim(), type: 'signup',
      })
      if (verifyError) {
        setError(verifyError.status === 429 ? signupRequestError(verifyError) :
          !verifyError.status || verifyError.status >= 500
            ? 'Verification is temporarily unavailable. Please try again.'
            : 'Invalid or expired code. Try again or request another signup confirmation.')
        return
      }
      // Validate the identity against the Auth server, not just a response/session.
      const verified = await supabase.auth.getUser()
      if (!data.session || verified.error || !verifiedSignupUser(verified.data.user, email)) {
        setError('Email verification could not be confirmed. Try again or sign in if you have already verified.')
        return
      }
      await confirmCredentials(verified.data.user!.id, referred)
    } catch {
      setError('Verification was interrupted. Please try again; if it already succeeded, sign in with your chosen password.')
    } finally {
      locked.current = false
      setIsLoading(false)
    }
  }

  const confirmCredentials = async (userId: string, referred: boolean) => {
    // A repeated signup for an unconfirmed account need not save a new password.
    // Prove reusable credentials before calling this account ready, including
    // after refresh where the user re-enters their original signup password.
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (result.error && (!result.error.status || result.error.status >= 500 || result.error.status === 429)) {
      setError('Password sign-in is temporarily unavailable. Please try verifying again; your email verification has been preserved.')
      return
    }
    if (result.error || !result.data.session ||
        result.data.user?.id !== userId || !verifiedSignupUser(result.data.user, email)) {
      await supabase.auth.signOut()
      setError('Your email may be verified, but we could not confirm this password. Sign in or recover access; signup does not replace an existing password.')
      return
    }
    setPassword('')
    await finishVerified(referred)
  }

  const resend = async () => {
    if (locked.current || Date.now() < resendAt) return
    locked.current = true
    setIsLoading(true)
    setError(null)
    const until = Date.now() + 60_000
    setResendAt(until)
    rememberPending(creatorReferred, until)
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
      if (resendError) setError(signupRequestError(resendError))
    } catch {
      setError('We could not resend the confirmation. Wait a minute, then try again.')
    } finally {
      locked.current = false
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      {step === 'details' ? (
        <>
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-[#1B5E35]/30 border border-[#1B5E35]/50 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-[#52B788]" />
              </div>
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-1 text-center">
              Create your account
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Choose a password, then verify your email to get started.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
              <p role="alert" className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="John Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
                autoComplete="name"
              />
            </div>

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

            {[
              { id: 'password', label: 'Password', value: password, change: setPassword },
              { id: 'confirmPassword', label: 'Confirm password', value: confirmation, change: setConfirmation },
            ].map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.label}</Label>
                <div className="relative">
                  <Input id={field.id} name={field.id} type={showPassword ? 'text' : 'password'}
                    value={field.value} onChange={(event) => field.change(event.target.value)}
                    required minLength={8} autoComplete="new-password" disabled={isLoading}
                    aria-describedby="password-help" className="h-11 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading} aria-label={`${showPassword ? 'Hide' : 'Show'} ${field.label.toLowerCase()}`}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            <p id="password-help" className="text-xs text-muted-foreground">
              At least 8 characters with a letter and number. Use this password to sign in on web and in the app.
            </p>
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
          <button type="button" disabled={isLoading} className="mt-4 text-sm underline"
            onClick={() => {
              if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                setError('Enter your signup email to resume verification.')
                return
              }
              setPassword(''); setConfirmation(''); setError(null)
              setStep('code'); rememberPending(creatorReferred, 0)
            }}>
            Already started? Resume email verification
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-[#D4AF37] hover:text-[#C19F27] font-medium transition-colors">
                Sign in
              </Link>
              {' or '}<Link href="/forgot-password" className="underline">Recover access</Link>
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
              If signup is available for{' '}
              <span className="text-foreground font-medium">{email}</span>,
              check your email for a 6-digit signup confirmation code.
            </p>
            <p className="mt-3 text-xs text-muted-foreground text-center">
              Your account is not ready until your email is verified. If the email has only a link and no code,
              contact support: the signup email configuration must be checked.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
              <p role="alert" className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signupPassword">Signup password</Label>
              <Input id="signupPassword" type={showPassword ? 'text' : 'password'}
                value={password} onChange={(event) => setPassword(event.target.value)}
                required autoComplete="current-password" disabled={isLoading || confirmationBlocked} />
              <p className="text-xs text-muted-foreground">Use the password you chose when you started signup.
                It is not saved in this browser when you refresh.</p>
              <button type="button" aria-pressed={showPassword} className="text-xs underline"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide signup password' : 'Show signup password'}
              </button>
            </div>
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
              disabled={isLoading || code.length !== 6 || confirmationBlocked}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
              ) : (
                'Verify email'
              )}
            </Button>
          </form>
          <Button type="button" variant="outline" className="w-full mt-4"
            disabled={isLoading || now < resendAt || confirmationBlocked} onClick={resend}>
            {now < resendAt ? `Resend in ${Math.ceil((resendAt - now) / 1000)}s` : 'Resend signup code'}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">{EXISTING_ACCOUNT_HELP}{' '}
            <Link href="/login" className="underline">Sign in</Link>{' or '}
            <Link href="/forgot-password" className="underline">Recover access</Link>.
          </p>

          <div className="mt-4 text-center">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                try { sessionStorage.removeItem(pendingKey) } catch {}
                setStep('details'); setCode(''); setError(null); setEmail(''); setDisplayName('')
                setCreatorReferred(false); setResendAt(0)
                setPassword(''); setConfirmation(''); setConfirmationBlocked(false)
              }}
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
