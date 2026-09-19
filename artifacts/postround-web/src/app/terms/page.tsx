import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageShell } from '@/components/LegalPageShell'

export const metadata: Metadata = {
  title: 'Terms of Service | Post Round',
  description: 'Review the terms that apply when you access or use Post Round.',
}

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms govern your access to and use of the Post Round app, website, and related services."
    >
      <p className="legal-updated">Last Updated: September 19, 2026</p>

      <section><h2>1. Acceptance of these terms</h2><p>By accessing or using Post Round, you agree to these Terms of Service and our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the service.</p></section>
      <section><h2>2. Accounts</h2><p>You must provide accurate information, keep your sign-in credentials secure, and promptly notify us of suspected unauthorized use. You are responsible for activity under your account. Do not share passwords or access tokens with us or with other users.</p></section>
      <section><h2>3. The service</h2><p>Post Round helps golfers record scores and round context, reflect on their game, use optional voice and AI features, create editable Stories, and optionally share approved content with creators. Features may change, be unavailable, or require an eligible account, subscription, or credits.</p></section>
      <section><h2>4. Your content</h2><p>You retain ownership of the golf data, notes, recordings, text, images, Stories, and other content you submit. You give Post Round permission to host, process, reproduce, and display that content only as needed to operate, secure, improve, and provide the service and the sharing choices you make. You represent that you have the rights needed to submit your content.</p></section>
      <section><h2>5. Voice and AI output</h2><p>Voice and AI features may convert, summarize, analyze, or generate content from information you provide. Automated output can be inaccurate, incomplete, or unsuitable. It is provided for informational and reflective purposes, not as professional instruction or a guarantee of performance. Review output before using or sharing it, and use your own judgment on the course.</p></section>
      <section><h2>6. Creator sharing</h2><p>You may choose to submit approved Stories or related content to creators you follow. Submission does not guarantee that a creator will view, use, publish, credit, or respond to the content. Only share content you are comfortable providing to the selected creator. A creator’s independent use outside Post Round may be governed by their own practices and applicable law.</p></section>
      <section><h2>7. Subscriptions, purchases, and credits</h2><p>Some features may require a paid subscription, in-app purchase, or credits. The price and terms shown at purchase apply. App Store transactions, billing, renewals, cancellations, and refunds are handled under Apple’s applicable terms and account settings. Credits may be limited to eligible features, have no cash value, and are not transferable unless the service expressly says otherwise. Deleting your Post Round account does not cancel an Apple subscription.</p></section>
      <section><h2>8. Acceptable use</h2><p>You may not misuse the service, violate law, infringe rights, harass others, submit harmful or deceptive content, attempt unauthorized access, interfere with operation or security, scrape or reverse engineer the service except where law permits, or use automated means to abuse features or evade limits.</p></section>
      <section><h2>9. Post Round intellectual property</h2><p>The service, including its software, design, branding, and original content other than user content, is protected by intellectual property laws. These terms give you a limited, personal, revocable, non-exclusive right to use the service as intended; they do not transfer ownership of Post Round intellectual property.</p></section>
      <section><h2>10. Third-party services</h2><p>Post Round depends on third-party services for functions such as authentication, hosting, AI processing, app distribution, and purchases. Third-party services may have their own terms and privacy policies. We are not responsible for third-party services outside our control.</p></section>
      <section><h2>11. Disclaimers</h2><p>To the fullest extent permitted by law, Post Round is provided “as is” and “as available.” We do not guarantee uninterrupted operation, error-free output, specific golf results, permanent availability of content, or that AI-generated insights will be accurate. Nothing in these terms excludes rights or warranties that cannot legally be excluded.</p></section>
      <section><h2>12. Limitation of liability</h2><p>To the fullest extent permitted by law, Post Round will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, or opportunities arising from use of the service. These limits do not apply where liability cannot legally be limited.</p></section>
      <section><h2>13. Suspension and termination</h2><p>You may stop using the service at any time. We may restrict or terminate access when reasonably necessary to protect users or the service, address violations, comply with law, or discontinue a feature. Provisions that by their nature should survive termination will remain in effect.</p></section>
      <section><h2>14. Account deletion</h2><p>You can request deletion at the <Link href="/delete-account">Delete Account page</Link>. Deletion is permanent and removes access to associated rounds, scorecards, insights, Stories, and other account data covered by the process. Limited records may be retained where reasonably necessary for legal, security, fraud-prevention, or audit purposes. Delete or export anything you want to keep before confirming.</p></section>
      <section><h2>15. Changes to these terms</h2><p>We may update these terms as Post Round changes. The revised terms will be posted with a new Last Updated date. Continued use after updated terms take effect means you accept them where permitted by law.</p></section>
      <section><h2>16. Contact</h2><p>Questions about these terms can be sent to <a href="mailto:support@postroundcoach.com">support@postroundcoach.com</a> or through our <Link href="/support">Support page</Link>.</p></section>
    </LegalPageShell>
  )
}