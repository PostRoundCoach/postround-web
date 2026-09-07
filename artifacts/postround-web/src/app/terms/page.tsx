import Link from 'next/link'
import { Footer } from '@/components/Footer'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <>
      <main className="min-h-screen py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-lg">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Acceptance of Terms</h2>
              <p>
                By accessing and using Post Round, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Use License</h2>
              <p>
                Permission is granted to use Post Round for personal, non-commercial purposes. This license shall automatically terminate if you violate any of these restrictions.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Service Description</h2>
              <p>
                Post Round helps golfers capture round context and may provide AI-powered learning and coaching insights based on information they choose to share. Any coaching information is for informational purposes only.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">User Responsibilities</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to provide accurate and complete information.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Limitation of Liability</h2>
              <p>
                Post Round shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Contact</h2>
              <p>
                Questions about the Terms of Service should be sent to us at terms@postroundcoach.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
