import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-serif text-xl mb-3 text-[#D4AF37]">Post Round Coach</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your AI golf coach after every round. Build your Player DNA and understand your game like never before.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
              <li><Link href="/#player-dna" className="hover:text-foreground transition-colors">Player DNA</Link></li>
              <li><Link href="/#testimonials" className="hover:text-foreground transition-colors">Testimonials</Link></li>
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
          <p>&copy; {new Date().getFullYear()} Post Round Coach. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
