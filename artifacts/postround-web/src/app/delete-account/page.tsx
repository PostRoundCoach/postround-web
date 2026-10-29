import { Metadata } from 'next'
import { DeleteAccountClient } from './DeleteAccountClient'
import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Delete Account | Post Round',
  description: 'Review account deletion steps and coverage limits for Post Round, operated by PR Coaching Software.',
}

export default function DeleteAccountPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-[#D4AF37] text-sm font-semibold tracking-[0.2em] uppercase">Account management</p>
            <h1 className="mt-3 font-serif text-4xl font-bold text-foreground">Delete your Post Round account</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Post Round is developed and operated by PR Coaching Software. Deletion is permanent. If you need help before continuing, contact <a className="underline hover:text-foreground" href="mailto:support@postroundcoach.com">support@postroundcoach.com</a>.</p>
          </div>

          <section aria-labelledby="deletion-instructions" className="mb-6 space-y-4 rounded-xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
            <h2 id="deletion-instructions" className="font-semibold text-foreground">Before you delete your account</h2>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Read these instructions, then sign in to the Post Round account you want to delete. If you cannot sign in, contact support for account-access help.</li>
              <li>Save anything you want to keep. Review the warnings, check the permanent-deletion acknowledgment, and type the exact word <strong className="text-foreground">DELETE</strong>.</li>
              <li>Select Permanently Delete Account once and wait for the result. If the outcome is unconfirmed, some data may already have been removed. Contact support before another request; do not retry to find out what happened.</li>
            </ol>
            <p>The process is intended to remove your account identity and the profile, round, scorecard, and related coaching data covered by application cleanup. It is not temporary deactivation and cannot be undone. It does not confirm erasure from every store.</p>
            <p>Security/audit history, separate waitlist marketing records, and detached creator referral records may remain. Removal of external provider records, uploaded media, logs, backups, and published copies is not confirmed by this process. Contact support with questions about retained information or processing status.</p>
            <p><strong className="text-foreground">Deletion does not cancel billing.</strong> Manage subscriptions separately with their provider. For an Apple App Store subscription, <a className="underline hover:text-foreground" href="https://support.apple.com/en-us/HT202039" target="_blank" rel="noopener noreferrer">cancel through your Apple ID settings</a> to stop future charges.</p>
            <p>Read our <Link className="underline hover:text-foreground" href="/privacy">Privacy Policy</Link> or visit <Link className="underline hover:text-foreground" href="/support">Support</Link> for help.</p>
          </section>

          <div className="bg-card border border-border rounded-xl shadow-lg">
            <DeleteAccountClient />
          </div>

          <div className="text-center mt-6">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
