import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { EmailCaptureModal } from '@/components/EmailCaptureModal';
import { Activity, Car, Disc, LineChart, MessageSquare, Shield } from 'lucide-react';
import { Link } from 'wouter';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      <div className="bg-noise" />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-serif font-medium text-lg tracking-wide text-zinc-100">
            POST ROUND COACH
          </div>
          <Button 
            variant="ghost" 
            className="text-sm tracking-wide text-zinc-300 hover:text-white hover:bg-white/5"
            onClick={() => setIsModalOpen(true)}
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-16">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-background to-background" />
        </div>
        
        <motion.div 
          className="relative z-10 max-w-4xl mx-auto text-center mt-12"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeIn} className="mb-6">
            <span className="uppercase tracking-[0.2em] text-xs font-semibold text-primary/80">
              The Post-Round Ritual, Perfected
            </span>
          </motion.div>
          <motion.h1 
            variants={fadeIn}
            className="font-serif text-5xl md:text-7xl lg:text-8xl text-zinc-100 mb-8 leading-[1.1]"
          >
            Your AI golf coach <br className="hidden md:block"/>
            <span className="text-zinc-500 italic">after every round.</span>
          </motion.h1>
          <motion.p 
            variants={fadeIn}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed"
          >
            Understand your game. Identify your patterns. Build your Player DNA.
            Stop leaving strokes in the parking lot.
          </motion.p>
          <motion.div variants={fadeIn}>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-sm uppercase tracking-widest transition-all hover:scale-105 duration-300"
              onClick={() => setIsModalOpen(true)}
            >
              Start Your Free Round Review
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* The Drive Home Section */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="relative z-10"
            >
              <motion.div variants={fadeIn} className="flex items-center gap-4 mb-8 text-primary/80">
                <Car className="w-5 h-5" />
                <span className="uppercase tracking-widest text-xs font-semibold">The Drive Home</span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="font-serif text-4xl md:text-5xl text-zinc-100 mb-6 leading-tight">
                The round doesn't end <br/> on the 18th green.
              </motion.h2>
              <motion.div variants={fadeIn} className="space-y-6 text-zinc-400 font-light text-lg">
                <p>
                  You're in the car. The radio is off. You're replaying the pulled drive on 4, the chunked wedge on 11, the 3-putt on 16.
                </p>
                <p>
                  Every golfer has a post-round ritual. We built an AI that meets you in that moment, turning frustration into clarity while the details are still fresh in your mind.
                </p>
              </motion.div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative aspect-[4/5] md:aspect-square"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-transparent z-10" />
              <img 
                src="/assets/hands-on-wheel.jpg" 
                alt="Driving home from the golf course" 
                className="w-full h-full object-cover rounded-sm opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Player DNA Section */}
      <section className="relative py-32 bg-zinc-950 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center flex-row-reverse">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="order-1 md:order-2 relative aspect-video md:aspect-[4/3] overflow-hidden rounded-sm border border-white/10"
            >
              <img 
                src="/assets/player-dna.jpg" 
                alt="Abstract Player DNA Visualization" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="order-2 md:order-1"
            >
              <motion.div variants={fadeIn} className="flex items-center gap-4 mb-8 text-primary/80">
                <Disc className="w-5 h-5" />
                <span className="uppercase tracking-widest text-xs font-semibold">The Analytics</span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="font-serif text-4xl md:text-5xl text-zinc-100 mb-6 leading-tight">
                Build your <br/> <span className="italic text-primary/90">Player DNA</span>
              </motion.h2>
              <motion.div variants={fadeIn} className="space-y-6 text-zinc-400 font-light text-lg">
                <p>
                  We don't just track fairways and greens. We analyze your emotional state, strategic decisions, and recurring miss patterns.
                </p>
                <p>
                  Over time, Post Round Coach builds a living profile of your game. It knows your tendencies before you do, and tells you what to practice before your next tee time.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works / Coaching Cycle */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/aerial-course.jpg" 
            alt="Aerial view of a golf course" 
            className="w-full h-full object-cover opacity-10 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-background/90 backdrop-blur-[2px]" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="font-serif text-4xl md:text-5xl text-zinc-100 mb-6">The Coaching Cycle</h2>
            <p className="text-zinc-400 font-light max-w-2xl mx-auto">A seamless loop of reflection, analysis, and targeted improvement.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 hidden md:block -z-10" />
            
            {[
              {
                icon: MessageSquare,
                title: "1. The Debrief",
                desc: "Talk to the AI on your drive home. Voice or text. Vent about the bad shots, brag about the good ones. Just be honest."
              },
              {
                icon: Activity,
                title: "2. The Synthesis",
                desc: "The AI extracts the hard data and the mental context, updating your Player DNA and identifying the root cause of today's score."
              },
              {
                icon: LineChart,
                title: "3. The Blueprint",
                desc: "Receive a tailored 30-minute practice plan focused exclusively on the one thing that will lower your score next time."
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-zinc-900/50 border border-white/5 p-8 backdrop-blur-sm"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 text-primary">
                  <step.icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-2xl text-zinc-100 mb-4">{step.title}</h3>
                <p className="text-zinc-400 font-light leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 bg-zinc-950 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <Shield className="w-8 h-8 text-primary/50 mx-auto" />
            <blockquote className="font-serif text-3xl md:text-4xl text-zinc-300 leading-snug">
              "It's like having a tour caddy in the passenger seat. I've stopped mindlessly hitting balls and started actually practicing what costs me strokes."
            </blockquote>
            <div className="text-zinc-500 uppercase tracking-widest text-sm">
              — Mark T., <span className="italic">4.2 Index</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/misty-fairway.jpg" 
            alt="Misty fairway" 
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-5xl md:text-6xl text-zinc-100 mb-8"
          >
            Stop guessing.<br/>Start knowing.
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-sm uppercase tracking-widest"
              onClick={() => setIsModalOpen(true)}
            >
              Get Early Access
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-serif text-xl tracking-wider text-zinc-500">
            POST ROUND COACH
          </div>
          <div className="flex gap-8 text-sm text-zinc-600 uppercase tracking-widest">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
            <a href="mailto:hello@postroundcoach.com" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      <EmailCaptureModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </main>
  );
}
