import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-[#1B5E35] via-[#0D1B12] to-black">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold text-white mb-1">
              POST ROUND COACH
            </h1>
            <p className="text-[#D4AF37] text-sm font-medium tracking-wide">
              AI GOLF COACH
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-card border border-border rounded-xl shadow-2xl">
            {children}
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
