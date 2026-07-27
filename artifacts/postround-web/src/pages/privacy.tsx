import { Link } from 'wouter';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 uppercase tracking-widest text-sm mb-12 block">
          &larr; Back to Home
        </Link>
        <h1 className="font-serif text-5xl text-zinc-100 mb-8">Privacy Policy</h1>
        <div className="prose prose-invert prose-zinc font-light text-zinc-400">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            This is a placeholder for the Post Round Coach privacy policy. We take your data seriously.
            Your Player DNA and post-round transcripts are encrypted and never shared with third parties.
          </p>
          <h2>Information We Collect</h2>
          <p>We collect your email address for early access registration.</p>
          <h2>How We Use Your Information</h2>
          <p>To contact you regarding product updates and early access invites.</p>
        </div>
      </div>
    </div>
  );
}
