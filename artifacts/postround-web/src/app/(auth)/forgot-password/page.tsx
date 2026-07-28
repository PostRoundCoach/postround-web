import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="h-12 w-12 rounded-full bg-[#1B5E35]/30 border border-[#1B5E35]/50 flex items-center justify-center">
          <Mail className="h-5 w-5 text-[#52B788]" />
        </div>
      </div>

      <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
        No password needed
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
        Post Round Coach uses a 6-digit email code to sign you in — there&apos;s no password to reset.
        Just sign in with your email and we&apos;ll send you a fresh code.
      </p>

      <Link href="/login">
        <Button variant="gold" size="lg" className="w-full">
          Sign In With Email Code
        </Button>
      </Link>

      <div className="mt-4">
        <Link href="/signup" className="text-sm text-[#D4AF37] hover:text-[#C19F27] transition-colors">
          Need an account? Sign up
        </Link>
      </div>
    </div>
  )
}
