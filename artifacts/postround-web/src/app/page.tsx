"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Flag, Menu, MessageSquareText, Share2, Sparkles, Target, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmailCaptureModal } from '@/components/EmailCaptureModal'
import { Footer } from '@/components/Footer'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'

const steps = [
  {
    label: 'Play',
    icon: Flag,
    copy: 'Play your round and capture it naturally as you go. Keep the score. Talk through the moments that matter.',
  },
  {
    label: 'Learn',
    icon: Brain,
    copy: 'Post Round combines your score and your own context to help you understand your game and find patterns across your rounds.',
  },
  {
    label: 'Share',
    icon: Share2,
    copy: 'Turn the moments that mattered into an editable Story. Keep it for yourself, share it with friends, or send it to a creator you follow.',
  },
]

const navigation = [
  ['How It Works', '#how-it-works'],
  ['Round Buddy', '#round-buddy'],
  ['AI Coaching', '#ai-coaching'],
  ['Player DNA', '#player-dna'],
  ['Share Your Round', '#share-your-round'],
  ['Creators', '#creators'],
]

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0D1B12]/75 px-5 py-4 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="font-serif text-sm font-bold uppercase tracking-[0.22em] text-foreground">
            Post Round
          </Link>
          <div className="hidden items-center gap-5 lg:flex">
            {navigation.map(([label, href]) => (
              <Link key={href} href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Log In</Button>
            </Link>
            <Button variant="gold" size="sm" onClick={() => setModalOpen(true)} className="hidden sm:inline-flex">
              Join the Launch Waitlist
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="mx-auto mt-4 grid max-w-7xl gap-1 border-t border-white/10 pt-3 lg:hidden">
            {navigation.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                onClick={() => setMobileNavOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <main>
        <section className="relative flex min-h-[100dvh] items-end overflow-hidden">
          <Image src="/golf-course-aerial.jpg" alt="A golf course at sunrise" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B12]/30 via-[#0D1B12]/45 to-[#0D1B12]" />
          <div className="container relative z-10 mx-auto px-6 pb-20 pt-36 md:pb-28">
            <div className="max-w-4xl">
              <FadeIn>
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-foreground/70">Post Round</p>
                <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-[#D4AF37]">Play. Learn. Share.</p>
                <h1 className="font-serif text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl lg:text-8xl">
                  Your golf round is more than a score.
                </h1>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="mt-7 max-w-2xl text-lg leading-relaxed text-foreground/80 md:text-xl">
                  It&apos;s the shot you flushed, the decision you questioned, the bounce you didn&apos;t expect, the birdie you fought for, and the moment you finally settled into your game.
                </p>
                <p className="mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-foreground md:text-xl">Post Round captures your round while you play, helps you understand it afterward, and turns the moments that mattered into stories worth sharing.</p>
              </FadeIn>
              <FadeIn delay={0.35}>
                <Button variant="gold" size="xl" onClick={() => setModalOpen(true)} className="mt-9 shadow-xl shadow-black/20">
                  Join the Launch Waitlist <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </FadeIn>
            </div>
          </div>
        </section>

        <section id="on-course-capture" className="py-24 md:py-32">
          <div className="container mx-auto px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <FadeIn direction="left">
                <div className="relative min-h-[420px] overflow-hidden rounded-3xl shadow-2xl md:min-h-[560px]">
                  <Image src="/golf-course-aerial.jpg" alt="Fairways, greens, and water across a golf course" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B12]/65 to-transparent" />
                  <p className="absolute bottom-7 left-7 font-serif text-3xl font-bold">The round comes first.</p>
                </div>
              </FadeIn>
              <FadeIn direction="right">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">The story starts on the course.</p>
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">The scorecard records what happened. Round Buddy captures why.</h2>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  Golf happens one hole at a time. Keep your score as you play, then talk naturally with Round Buddy after each hole while the shots, decisions, conditions, and feelings are still fresh.
                </p>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">That context becomes part of your round — giving Post Round something a traditional scorecard never can.</p>
                <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                  <p className="font-semibold text-foreground">Your score tells us what happened.</p>
                  <p className="mt-2 text-muted-foreground">Your words help explain why.</p>
                </div>
              </FadeIn>
            </div>
            <StaggerContainer className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                ['Keep the score', 'Record the result of every hole and preserve the structure of your round.'],
                ['Capture what happened', 'Tell Round Buddy about the shots, decisions, conditions, turning points, and moments you want to remember.'],
                ['Keep the context', 'Your score tells us what happened. Your words help explain why.'],
              ].map(([title, copy]) => (
                <StaggerItem key={title}>
                  <div className="h-full rounded-2xl border border-border bg-card p-7">
                    <Flag className="h-7 w-7 text-primary" />
                    <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section id="round-buddy" className="overflow-hidden bg-gradient-to-br from-primary/10 via-card/50 to-background py-24 md:py-32">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Round Buddy</p>
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">Your on-course companion.</h2>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  You shouldn&apos;t have to reconstruct your round afterward. After each hole, tell Round Buddy what happened in your own words. Talk about the fairway, the miss, the wind, the decision, the recovery, the putt — whatever mattered to you. Round Buddy keeps track of the score and the story as your round unfolds.
                </p>
              </div>
            </FadeIn>
            <StaggerContainer className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
              {[
                ['Speak naturally', 'Talk to Round Buddy like you would talk to a playing partner.'],
                ['Capture the moment', 'Record thoughts and reactions while they’re still fresh instead of trying to remember them hours later.'],
                ['Build the story', 'Every hole adds another piece of the round — the score, the context, and the moments that made it yours.'],
              ].map(([title, copy]) => (
                <StaggerItem key={title}>
                  <div className="h-full rounded-2xl border border-border bg-card p-7">
                    <MessageSquareText className="h-7 w-7 text-[#D4AF37]" />
                    <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section id="ai-coaching" className="py-24 md:py-32">
          <div className="container mx-auto px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <FadeIn direction="left">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Learn</p>
                   <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">Your round has more to teach you than your score.</h2>
                  <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                      Once the round is complete, Post Round brings your score and your own observations together. AI coaching helps identify patterns, connect decisions to outcomes, and turn what happened on the course into useful reflection for your next round. You bring the experience. Post Round helps you learn from it.
                  </p>
                  <div className="mt-8 flex gap-4 rounded-2xl border border-border bg-card p-6">
                    <BookOpen className="mt-1 h-6 w-6 shrink-0 text-[#D4AF37]" />
                     <p className="text-muted-foreground">Coaching should add perspective — not invent certainty. Insights are grounded in the score and context you choose to capture.</p>
                  </div>
                </div>
              </FadeIn>
              <FadeIn direction="right">
                <div className="relative min-h-[480px] overflow-hidden rounded-3xl border border-border bg-[#102719]">
                  <Image src="/player-dna-visual.jpg" alt="An abstract golf-inspired learning pattern" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover opacity-35" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B12] via-[#0D1B12]/55 to-transparent" />
                  <div className="absolute inset-x-7 bottom-7 space-y-4">
                    <div className="rounded-xl border border-white/10 bg-black/25 p-5 backdrop-blur">
                      <p className="text-xs uppercase tracking-widest text-primary">A moment you captured</p>
                      <p className="mt-2">“I kept choosing the safe line, but never committed to it.”</p>
                    </div>
                    <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-5 backdrop-blur">
                      <p className="text-xs uppercase tracking-widest text-[#D4AF37]">A question for next round</p>
                      <p className="mt-2">What changes when you choose a target you can fully commit to?</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
            <StaggerContainer className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                ['Understand your round', 'See what happened across your game, not just what you scored.'],
                ['Find patterns', 'Identify recurring situations, decisions, and outcomes across your rounds.'],
                ['Practice with purpose', 'Turn what you learn on the course into areas to focus on before you play again.'],
              ].map(([title, copy]) => (
                <StaggerItem key={title}>
                  <div className="h-full rounded-2xl border border-border bg-card p-7">
                    <BookOpen className="h-7 w-7 text-primary" />
                    <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <div id="player-dna" className="mt-16">
              <FadeIn>
                <div className="mx-auto max-w-3xl text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Player DNA</p>
                   <h3 className="mt-4 font-serif text-3xl font-bold md:text-5xl">A living picture of your game.</h3>
                    <p className="mt-5 text-lg text-muted-foreground">Your golf changes. Your patterns change. Your Player DNA evolves with you. As you capture more rounds, Post Round builds a richer picture of how you actually play — the situations you handle well, the patterns that keep showing up, and the decisions that influence your results.</p>
                </div>
              </FadeIn>
              <StaggerContainer className="mt-10 grid gap-5 md:grid-cols-3">
                {[
                   [TrendingUp, 'Patterns across rounds', 'See recurring situations, choices, and outcomes in the context of your actual rounds.'],
                  [Target, 'Scoring context', 'Connect where strokes were gained or lost with what you were trying to do on the course.'],
                   [Brain, 'Mental tendencies', 'Reflect on commitment, focus, recovery, and decision-making when those themes appear in your rounds.'],
                ].map(([Icon, title, copy]) => {
                  const FeatureIcon = Icon as typeof Brain
                  return (
                    <StaggerItem key={title as string}>
                      <div className="h-full rounded-2xl border border-border bg-card p-7">
                        <FeatureIcon className="h-7 w-7 text-primary" />
                        <h4 className="mt-5 text-xl font-semibold">{title as string}</h4>
                        <p className="mt-3 leading-relaxed text-muted-foreground">{copy as string}</p>
                      </div>
                    </StaggerItem>
                  )
                })}
              </StaggerContainer>
            </div>
          </div>
        </section>

        <section id="share-your-round" className="bg-card/30 py-24 md:py-32">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37]/15">
                  <Sparkles className="h-7 w-7 text-[#D4AF37]" />
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Share</p>
                 <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">Your golf is already a story.</h2>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                   Post Round brings your score and Round Buddy context together to find the moments that are worth remembering — and worth sharing. A great round. A ridiculous hole. A breakthrough. A personal best. A lesson you finally learned.
                </p>
                 <p className="mt-5 font-semibold text-foreground">Post Round turns what actually happened on the course into an editable Story grounded in your real round.</p>
              </div>
            </FadeIn>
            <StaggerContainer className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
              {[
                ['You decide what gets shared', 'Review and approve your Story before it goes anywhere.'],
                ['Share with the people you follow', 'Send an approved Story directly to a creator you follow — giving them the opportunity to share your golf with their audience.'],
                ['Follow the golfers you care about', 'Discover creators, follow their golf, see their Stories, and become part of the conversation around the game.'],
              ].map(([title, copy], index) => (
                <StaggerItem key={title}>
                  <div className="h-full rounded-2xl border border-border bg-card p-7">
                    <p className="text-sm font-semibold text-[#D4AF37]">Step {index + 1}</p>
                    <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section id="creators" className="py-24 md:py-32">
          <div className="container mx-auto grid gap-12 px-6 md:grid-cols-2 md:items-center">
            <FadeIn direction="left">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">For creators</p>
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">Your audience is already playing golf.</h2>
                <p className="mt-6 text-xl text-foreground">What if their golf could become your content?</p>
              </div>
            </FadeIn>
            <FadeIn direction="right">
              <div className="space-y-5 text-lg leading-relaxed text-muted-foreground">
                <p>Post Round gives players a way to send their approved golf Stories directly to creators they follow.</p>
                <p>A great score. A first birdie. A breakthrough. A brutal hole. A ridiculous recovery.</p>
                <p className="font-semibold text-foreground">Your audience creates the golf. Post Round turns it into content.</p>
                <p>Creators can discover authentic stories from the golfers who follow them and choose the moments they want to share with their own audience.</p>
                <p>No manufactured content. No guessing what your audience is doing.</p>
                <p className="font-semibold text-[#D4AF37]">Real golfers. Real rounds. Real stories.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        <section id="golf-connections" className="bg-card/30 py-24 md:py-32">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="mx-auto max-w-4xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">A different kind of golf connection.</p>
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">Follow the golfers you want to hear from.</h2>
                <div className="mx-auto mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-muted-foreground">
                  <p>Post Round isn&apos;t just about improving your own game. It&apos;s about making golf more connected.</p>
                  <p>Follow creators you care about. See their rounds and Stories. Share your own golf directly with them. And maybe one day, see your Story become part of theirs.</p>
                  <p className="font-semibold text-foreground">The golfer you follow isn&apos;t just someone on a screen. They&apos;re part of your golf world.</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section id="how-it-works" className="py-24 md:py-32">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Play. Learn. Share.</p>
                 <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">How it all comes together</h2>
              </div>
            </FadeIn>
            <StaggerContainer className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map(({ label, icon: Icon, copy }, index) => (
                <StaggerItem key={label}>
                  <div className="h-full rounded-2xl border border-border bg-card p-8">
                    <div className="flex items-center justify-between">
                      <Icon className="h-7 w-7 text-primary" />
                      <span className="font-serif text-4xl text-border">0{index + 1}</span>
                    </div>
                    <h3 className="mt-10 font-serif text-3xl font-bold">{label}</h3>
                    <p className="mt-4 leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0D1B12] py-24 md:py-32">
          <div className="absolute inset-0 bg-[url('/golf-course-aerial.jpg')] bg-cover bg-center opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B12] via-[#0D1B12]/85 to-[#0D1B12]/60" />
          <div className="container relative z-10 mx-auto px-6 text-center">
            <FadeIn>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Post Round</p>
               <h2 className="mt-4 font-serif text-5xl font-bold md:text-7xl">Your game. Your story. Your people.</h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/75">Golf is more than the number on the card.</p>
                <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold text-foreground">Play your round. Learn from what happened. Share the moments that made it yours.</p>
              <Button variant="gold" size="xl" onClick={() => setModalOpen(true)} className="mt-9">
                Join the Launch Waitlist <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </FadeIn>
          </div>
        </section>

        <Footer />
      </main>
      <EmailCaptureModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}