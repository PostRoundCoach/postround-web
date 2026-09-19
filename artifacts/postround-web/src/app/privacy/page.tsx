import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageShell } from '@/components/LegalPageShell'

export const metadata: Metadata = {
  title: 'Privacy Policy | Post Round',
  description: 'Learn how Post Round collects, uses, shares, and protects information when you use the app and website.',
}

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="This policy explains what information Post Round handles, why we use it, and the choices available to you."
    >
      <p className="legal-updated">Last Updated: September 19, 2026</p>

      <section>
        <h2>1. Information you provide</h2>
        <p>We may collect account information such as your name, email address, profile details, and authentication information when you create or use an account. We also process messages you send to support.</p>
      </section>

      <section>
        <h2>2. Golf and round information</h2>
        <p>Post Round processes information you add about your golf, including courses, rounds, holes, scores, shots, notes, conditions, decisions, highlights, and reflections. We use this information to provide scorecards, round history, coaching features, Player DNA, Stories, and other app functions you request.</p>
      </section>

      <section>
        <h2>3. Voice capture</h2>
        <p>If you choose to use Round Buddy voice features, the app processes the audio or speech you intentionally submit so it can turn your account of a hole or round into usable text and context. Voice capture is user-initiated. Depending on the feature, audio, transcripts, or information derived from them may be processed by service providers that help us operate voice and AI functions.</p>
      </section>

      <section>
        <h2>4. AI features</h2>
        <p>Post Round may use your round information and the context you provide to generate coaching reflections, patterns, summaries, or draft Stories. These features use automated systems and may produce incomplete or inaccurate results. You should review AI-generated content before relying on or sharing it.</p>
      </section>

      <section>
        <h2>5. Creator sharing and user choices</h2>
        <p>Sharing with creators is optional. When you choose to submit or approve a Story for a creator, the approved content and relevant profile or round context may be made available to that creator. You control whether to initiate this sharing and can review content before approval. Content a creator has already used or published may remain outside Post Round’s control.</p>
      </section>

      <section>
        <h2>6. Purchases and subscriptions</h2>
        <p>Purchases, subscriptions, and related billing are handled through the platform or payment service shown at checkout, such as Apple’s App Store. Post Round may receive purchase status, product, entitlement, credit, and transaction-related information needed to provide paid features, restore purchases, prevent fraud, and support your account. We do not need your full payment-card number to provide these functions.</p>
      </section>

      <section>
        <h2>7. Technical and operational information</h2>
        <p>We may process device, app, browser, network, log, diagnostic, security, and usage information when you interact with Post Round. We use it to operate the service, keep it secure, troubleshoot problems, understand feature performance, and prevent misuse.</p>
      </section>

      <section>
        <h2>8. How we use information</h2>
        <p>We use information to provide and personalize Post Round; authenticate users; save and synchronize rounds; deliver AI, voice, creator, subscription, and credit features; respond to support; maintain security; diagnose errors; enforce our terms; and improve the service.</p>
      </section>

      <section>
        <h2>9. Service providers and third-party services</h2>
        <p>We rely on service providers to support functions such as account authentication, database hosting, app distribution, purchases, AI processing, and infrastructure. Supabase supports account and data services, and Apple may process App Store purchases. These providers process information under their own terms and privacy practices. We may also disclose information when required by law, to protect rights or safety, or in connection with a business transfer.</p>
      </section>

      <section>
        <h2>10. Retention and security</h2>
        <p>We retain information for as long as reasonably needed to provide the service, maintain security, comply with legal obligations, resolve disputes, and enforce agreements. Retention can vary by the type of information and why it is used. We use reasonable safeguards, but no storage or transmission method is completely secure.</p>
      </section>

      <section>
        <h2>11. Your choices and account deletion</h2>
        <p>You can choose what round context to provide and whether to use optional voice or creator-sharing features. You may request permanent account deletion through our <Link href="/delete-account">Delete Account page</Link>. Deletion removes the account data covered by that process, subject to limited information we may retain where reasonably necessary for security, legal, fraud-prevention, or audit purposes. Deleting your Post Round account does not cancel an Apple App Store subscription.</p>
      </section>

      <section>
        <h2>12. Children’s privacy</h2>
        <p>Post Round is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided personal information, contact us so we can review the matter.</p>
      </section>

      <section>
        <h2>13. Changes and contact</h2>
        <p>We may update this policy as the service changes. We will post the revised policy with a new Last Updated date. Questions or privacy requests can be sent to <a href="mailto:support@postroundcoach.com">support@postroundcoach.com</a> or through our <Link href="/support">Support page</Link>.</p>
      </section>
    </LegalPageShell>
  )
}