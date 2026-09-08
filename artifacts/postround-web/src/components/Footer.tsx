import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-serif text-xl mb-3 text-[#D4AF37]">Post Round</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              <span className="font-semibold text-foreground">Your game. Your story. Your people.</span><br />
              Play your round, learn from it, and share what mattered.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#round-buddy" className="hover:text-foreground transition-colors">Round Buddy</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
              <li><Link href="/#ai-coaching" className="hover:text-foreground transition-colors">AI Coaching</Link></li>
              <li><Link href="/#player-dna" className="hover:text-foreground transition-colors">Player DNA</Link></li>
              <li><Link href="/#share-your-round" className="hover:text-foreground transition-colors">Share Your Round</Link></li>
              <li><Link href="/#creators" className="hover:text-foreground transition-colors">Creators</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Post Round. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
