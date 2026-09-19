import { Metadata } from 'next'
import { DeleteAccountClient } from './DeleteAccountClient'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Delete Account - Post Round',
  description: 'Permanently delete your Post Round account and associated data.',
}

export default function DeleteAccountPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
              POST ROUND
            </h1>
            <p className="text-muted-foreground text-sm font-medium tracking-wide">
              ACCOUNT MANAGEMENT
            </p>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-xl shadow-lg">
            <DeleteAccountClient />
          </div>

          {/* Footer Link */}
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
    </div>
  )
}
