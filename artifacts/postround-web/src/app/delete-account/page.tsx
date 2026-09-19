import { Metadata } from 'next'
import { DeleteAccountClient } from './DeleteAccountClient'
import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Delete Account | Post Round',
  description: 'Learn what account deletion removes and permanently delete your Post Round account.',
}

export default function DeleteAccountPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-[#D4AF37] text-sm font-semibold tracking-[0.2em] uppercase">Account management</p>
            <h1 className="mt-3 font-serif text-4xl font-bold text-foreground">Delete your Post Round account</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Deletion is permanent. You will lose the account data described below. If you need help before continuing, contact <a className="underline hover:text-foreground" href="mailto:support@postroundcoach.com">support@postroundcoach.com</a>.</p>
          </div>

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
