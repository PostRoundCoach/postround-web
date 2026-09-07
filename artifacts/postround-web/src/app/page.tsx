"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Flag, MessageSquareText, Share2, Sparkles, Target, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmailCaptureModal } from '@/components/EmailCaptureModal'
import { Footer } from '@/components/Footer'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'

const steps = [
  {
    label: 'Play',
    icon: Flag,
    copy: 'Play your round. Chase a number, a feeling, a shot you know is in there.',
  },
  {
    label: 'Learn',
    icon: Brain,
    copy: 'Capture what happened in your own words, then turn the round into useful context and coaching.',
  },
  {
    label: 'Share',
    icon: Share2,
    copy: 'Soon, shape the moments and lessons from your game into stories other golfers can follow.',
  },
]

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0D1B12]/75 px-5 py-4 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="font-serif text-sm font-bold uppercase tracking-[0.22em] text-foreground">
            Post Round
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Log In</Button>
            </Link>
            <Button variant="gold" size="sm" onClick={() => setModalOpen(true)} className="hidden sm:inline-flex">
              Join the Launch Waitlist
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative flex min-h-[100dvh] items-end overflow-hidden">
          <Image src="/golf-course-aerial.jpg" alt="A golf course at sunrise" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B12]/30 via-[#0D1B12]/45 to-[#0D1B12]" />
          <div className="container relative z-10 mx-auto px-6 pb-20 pt-36 md:pb-28">
            <div className="max-w-4xl">
              <FadeIn>
                <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-[#D4AF37]">Play. Learn. Share.</p>
                <h1 className="font-serif text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl lg:text-8xl">
                  Your golf round is more than a score.
                </h1>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="mt-7 max-w-2xl text-lg leading-relaxed text-foreground/80 md:text-xl">
                  It&apos;s a story of decisions, misses, breakthroughs, and moments worth remembering. Post Round helps you capture the round, learn from it, and—one day—share your game with the people who care.
                </p>
              </FadeIn>
              <FadeIn delay={0.35}>
                <Button variant="gold" size="xl" onClick={() => setModalOpen(true)} className="mt-9 shadow-xl shadow-black/20">
                  Join the Launch Waitlist <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="bg-card/30 py-24 md:py-32">
          <div className="container mx-auto grid gap-12 px-6 md:grid-cols-[0.85fr_1.15fr] md:items-center">
            <FadeIn direction="left">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">The story of a round</p>
              <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">The card keeps the score. You remember everything else.</h2>
            </FadeIn>
            <FadeIn direction="right">
              <div className="space-y-5 text-lg leading-relaxed text-muted-foreground">
                <p>The flushed iron. The decision you&apos;d take back. The bounce that changed the hole. The calm you found after a rough start.</p>
                <p>Those details are what make a round yours—and they&apos;re where the most useful lessons live. Post Round starts with the whole experience, not just the number at the bottom of the card.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        <section id="play" className="py-24 md:py-32">
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
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Play</p>
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">Be there for the round.</h2>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  Post Round is built around golf as it&apos;s actually played: one shot, one choice, one hole at a time. Play freely. When the round is over, bring back the score and the moments that mattered.
                </p>
                <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                  <p className="font-semibold text-foreground">The scorecard gives the round its shape.</p>
                  <p className="mt-2 text-muted-foreground">Hole-by-hole scoring creates the backbone. Round Buddy adds the decisions, conditions, and feelings that explain how the number came to be.</p>
                </div>
              </FadeIn>
            </div>
            <StaggerContainer className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                ['Keep the score', 'Record the hole-by-hole result and preserve the structure of the round.'],
                ['Mark what mattered', 'Call out the turning points, good swings, misses, and decisions you want to remember.'],
                ['Add the human context', 'Use Round Buddy to put the round into your own words while it is still clear.'],
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
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">Your round, in your own words.</h2>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  Round Buddy helps capture the context a scorecard misses—what you were trying to do, what felt different, and which moments stayed with you. Add what matters in the way that feels natural to you.
                </p>
              </div>
            </FadeIn>
            <StaggerContainer className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
              {[
                ['Remember the moment', 'Save the shots, choices, and turning points you want to revisit.'],
                ['Add your context', 'Describe the lie, the wind, the thought, or the feeling behind the result.'],
                ['Keep the full round', 'Build a richer record of how you played—not only what you scored.'],
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

        <section id="learn" className="py-24 md:py-32">
          <div className="container mx-auto px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <FadeIn direction="left">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Learn</p>
                  <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">See your game more clearly.</h2>
                  <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                    AI coaching is the learning layer: it helps organize the scorecard and context you captured, surface themes across rounds, and offer useful questions for the next one. You bring the experience. Post Round helps you reflect on it.
                  </p>
                  <div className="mt-8 flex gap-4 rounded-2xl border border-border bg-card p-6">
                    <BookOpen className="mt-1 h-6 w-6 shrink-0 text-[#D4AF37]" />
                    <p className="text-muted-foreground">Coaching should add perspective—not invent certainty. Insights are grounded in the score and context you choose to share.</p>
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
            <div id="player-dna" className="mt-16">
              <FadeIn>
                <div className="mx-auto max-w-3xl text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Player DNA</p>
                  <h3 className="mt-4 font-serif text-3xl font-bold md:text-5xl">A living picture of how you play.</h3>
                  <p className="mt-5 text-lg text-muted-foreground">As rounds accumulate, Player DNA is designed to organize recurring themes without reducing your game to a single number.</p>
                </div>
              </FadeIn>
              <StaggerContainer className="mt-10 grid gap-5 md:grid-cols-3">
                {[
                  [TrendingUp, 'Patterns across rounds', 'Notice recurring situations, choices, and outcomes in the context of the rounds you captured.'],
                  [Target, 'Scoring context', 'Connect where strokes were gained or lost with what you were trying to do on the course.'],
                  [Brain, 'Mental tendencies', 'Reflect on commitment, focus, recovery, and decision-making when those themes show up in your notes.'],
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

        <section id="share" className="bg-card/30 py-24 md:py-32">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37]/15">
                  <Sparkles className="h-7 w-7 text-[#D4AF37]" />
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Share</p>
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">Every golfer has a story worth following.</h2>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  We&apos;re building toward a creator experience where a golfer can choose a scorecard, select the Round Buddy context they want included, and shape those moments into a story for the creators and golfers they care about. Sharing is part of the direction—not a promise of what&apos;s available today.
                </p>
                <p className="mt-5 text-sm font-medium text-primary">Creator sharing is in development.</p>
              </div>
            </FadeIn>
            <StaggerContainer className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
              {[
                ['Choose the round', 'Start with the scorecard and the round you want to tell a story about.'],
                ['Choose your context', 'Select only the Round Buddy moments and reflections you want a creator to receive.'],
                ['Follow the story', 'The intended experience lets a favourite creator turn that selected context into something worth sharing back with the golf community.'],
              ].map(([title, copy], index) => (
                <StaggerItem key={title}>
                  <div className="h-full rounded-2xl border border-border bg-card p-7">
                    <p className="text-sm font-semibold text-[#D4AF37]">Future step {index + 1}</p>
                    <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section id="how-it-works" className="py-24 md:py-32">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Play. Learn. Share.</p>
                <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">A home for the whole game.</h2>
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
              <h2 className="mt-4 font-serif text-5xl font-bold md:text-7xl">Your game. Your story.</h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/75">Be among the first to experience a better way to remember your rounds and learn from the game you play.</p>
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