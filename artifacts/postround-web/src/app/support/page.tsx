import type { Metadata } from 'next'
import Link from 'next/link'
import { Bug, CreditCard, LockKeyhole, Mail, MessageCircleQuestion, UserRound } from 'lucide-react'
import { LegalPageShell } from '@/components/LegalPageShell'

export const metadata: Metadata = {
  title: 'Support | Post Round',
  description: 'Get help with your Post Round account, rounds, purchases, app issues, and account deletion.',
}

const topics = [
  [UserRound, 'Account and round help', 'Get help signing in, updating account details, or resolving missing rounds, scores, and Stories.'],
  [MessageCircleQuestion, 'Round Buddy and AI features', 'Tell us what you expected, what happened, and which round or hole was affected.'],
  [CreditCard, 'Purchases and subscriptions', 'For missing access, try restoring purchases in the app and confirm you are using the Apple ID that made the purchase.'],
  [Bug, 'Bug reports', 'Include your device model, app version, the steps you took, and any on-screen error. A screenshot is helpful when it contains no sensitive information.'],
] as const

export default function SupportPage() {
  return (
    <LegalPageShell
      eyebrow="Help"
      title="Post Round Support"
      description="Need help with your account, a round, or an app feature? We’ll help you get back to your game."
    >
      <section className="support-callout">
        <Mail className="h-6 w-6 text-[#D4AF37]" aria-hidden="true" />
        <div>
          <h2>Email support</h2>
          <p>Contact us at <a href="mailto:support@postroundcoach.com">support@postroundcoach.com</a>. Please describe what happened and the email address associated with your account.</p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {topics.map(([Icon, title, copy]) => (
          <section key={title} className="support-card">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2>{title}</h2>
            <p>{copy}</p>
          </section>
        ))}
      </div>

      <section>
        <h2>Account deletion</h2>
        <p>You can permanently delete your account through the <Link href="/delete-account">Delete Account page</Link>. This removes the account data covered by the deletion process and cannot be undone. Account deletion does not cancel an Apple App Store subscription; subscriptions must be managed separately through your Apple ID settings.</p>
      </section>

      <section>
        <h2>Frequently asked questions</h2>
        <h3>Why is a round or score missing?</h3>
        <p>First confirm that you are signed into the account used to create the round and that your device has a working connection. If it is still missing, email us with the approximate date and course name.</p>
        <h3>Why can’t I access a purchase?</h3>
        <p>Confirm that the App Store shows an active purchase or subscription, then use the app’s restore-purchases option if available. If access is still missing, contact us and include the product name and purchase date. Do not email full receipts if they contain sensitive information.</p>
        <h3>Can support cancel my Apple subscription?</h3>
        <p>No. Apple manages App Store subscriptions. Use your Apple ID subscription settings to view or cancel a subscription.</p>
        <h3>What should I include in a bug report?</h3>
        <p>Include your device model, operating system and app version, the steps that led to the issue, what you expected, and what appeared instead.</p>
      </section>

      <section className="support-warning">
        <LockKeyhole className="h-6 w-6 shrink-0 text-[#D4AF37]" aria-hidden="true" />
        <div>
          <h2>Protect your information</h2>
          <p>Never send us your password, authentication code, full payment-card number, bank details, or other sensitive payment information. Post Round support will not ask for your password.</p>
        </div>
      </section>
    </LegalPageShell>
  )
}