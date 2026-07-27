import { Link } from 'wouter';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 uppercase tracking-widest text-sm mb-12 block">
          &larr; Back to Home
        </Link>
        <h1 className="font-serif text-5xl text-zinc-100 mb-8">Terms of Service</h1>
        <div className="prose prose-invert prose-zinc font-light text-zinc-400">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            This is a placeholder for the Post Round Coach terms of service.
          </p>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using our service, you accept and agree to be bound by the terms and provision of this agreement.</p>
          <h2>2. Description of Service</h2>
          <p>Post Round Coach provides AI-powered golf analysis tools.</p>
        </div>
      </div>
    </div>
  );
}
