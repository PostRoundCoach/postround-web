'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { requestAccountDeletion } from '@/lib/account-deletion/client'

export function DeleteAccountClient() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function checkSession() {
      if (!supabase) {
        setIsLoadingSession(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setIsLoadingSession(false)
    }
    checkSession()
  }, [supabase])

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acknowledged || confirmationText !== 'DELETE') return
    if (!session) return

    setIsDeleting(true)
    setDeleteStatus('idle')
    setErrorMessage('')

    try {
      await requestAccountDeletion(session.access_token)

      // Success - sign out locally
      if (supabase) {
        await supabase.auth.signOut()
      }
      
      setDeleteStatus('success')
    } catch (err: unknown) {
      setDeleteStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Your account could not be deleted. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoadingSession) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (deleteStatus === 'success') {
    return (
      <div className="p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-[#1B5E35]/20 border border-[#1B5E35]/30 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-[#52B788]" />
          </div>
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
            Account Deleted
          </h2>
          <p className="text-muted-foreground mb-6">
            Your Post Round account and associated data have been permanently removed.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-left text-muted-foreground mb-6">
            <strong>Note:</strong> This does not automatically cancel any Apple App Store subscriptions. 
            If you have an active subscription, you must cancel it through your Apple ID settings.
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full" asChild>
              <a href="https://support.apple.com/en-us/HT202039" target="_blank" rel="noopener noreferrer">
                Manage Apple Subscriptions
              </a>
            </Button>
            <Button variant="gold" className="w-full" onClick={() => router.push('/')}>
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-3">
          Sign In Required
        </h2>
        <p className="text-muted-foreground mb-8">
          You must be signed in to request permanent account deletion. If you need help accessing your account, contact <a href="mailto:support@postroundcoach.com" className="underline hover:text-foreground">support@postroundcoach.com</a>.
        </p>
        <Button variant="gold" size="lg" className="w-full" asChild>
          <Link href="/login?next=/delete-account">
            Sign In to Continue
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6 text-destructive">
        <AlertTriangle className="h-6 w-6" />
        <h2 className="font-serif text-2xl font-bold">Delete Account</h2>
      </div>

      <div className="space-y-6 text-sm text-muted-foreground">
        <p>
          You are about to permanently delete your Post Round account for <strong className="text-foreground">{session?.user?.email}</strong>.
        </p>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">What happens next?</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your profile, rounds, scorecards, and insights will be permanently deleted.</li>
            <li>You will immediately lose access to all coaching features.</li>
            <li>Basic security and audit records may be retained for compliance.</li>
            <li><strong>This action cannot be undone.</strong></li>
          </ul>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <strong className="block mb-1">Important Subscription Notice</strong>
          Deleting your account <strong>does not</strong> cancel your Apple App Store subscription. You must <a href="https://support.apple.com/en-us/HT202039" target="_blank" rel="noopener noreferrer" className="underline hover:text-destructive/80 font-medium">cancel your subscription through Apple</a> to stop future charges.
        </div>

        {deleteStatus === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive font-medium">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleDelete} className="mt-8 space-y-4 pt-4 border-t border-border">
          <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-foreground">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              disabled={isDeleting}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>I understand this permanently deletes my Post Round account and cannot be undone.</span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-foreground">
              Type <strong>DELETE</strong> to confirm
            </Label>
            <Input
              id="confirm"
              type="text"
              placeholder="DELETE"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              className="h-11 font-mono uppercase"
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={!acknowledged || confirmationText !== 'DELETE' || isDeleting}
          >
            {isDeleting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting Account...</>
            ) : (
              'Permanently Delete Account'
            )}
          </Button>
        </form>

        <div className="text-center pt-4 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span className="hidden sm:inline text-border">•</span>
          <a href="mailto:support@postroundcoach.com" className="hover:text-foreground transition-colors">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
