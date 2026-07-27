"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { EmailCaptureModal } from '@/components/EmailCaptureModal'
import { Footer } from '@/components/Footer'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { MessageCircle, TrendingUp, Target, Brain, CheckCircle, ArrowRight } from 'lucide-react'

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0D1B12] via-[#1B5E35]/20 to-background">
          <div className="absolute inset-0 bg-[url('/golf-course-aerial.jpg')] bg-cover bg-center opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
          
          <div className="container relative z-10 mx-auto px-6 py-20 text-center">
            <FadeIn delay={0.2}>
              <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-bold mb-6 tracking-tight">
                <span className="bg-gradient-to-br from-[#52B788] to-[#D4AF37] bg-clip-text text-transparent">
                  POST ROUND
                </span>
                <br />
                <span className="text-foreground">COACH</span>
              </h1>
            </FadeIn>
            
            <FadeIn delay={0.4}>
              <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
                Your AI golf coach after every round.
              </p>
            </FadeIn>
            
            <FadeIn delay={0.6}>
              <p className="text-base md:text-lg text-muted-foreground/80 mb-12 max-w-xl mx-auto">
                Understand your game. Identify your patterns. Build your Player DNA.
              </p>
            </FadeIn>
            
            <FadeIn delay={0.8}>
              <Button 
                variant="gold" 
                size="xl" 
                onClick={() => setModalOpen(true)}
                className="shadow-lg shadow-[#D4AF37]/20 hover:shadow-xl hover:shadow-[#D4AF37]/30 transition-all"
              >
                Start Your Free Round Review
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </FadeIn>
          </div>
        </section>

        {/* The Ritual Section */}
        <section className="py-24 md:py-32 bg-card/30">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <FadeIn direction="left">
                <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                  <Image 
                    src="/golfer-car-dusk.jpg"
                    alt="Golfer reflecting after a round"
                    fill
                    className="object-cover"
                  />
                </div>
              </FadeIn>
              
              <FadeIn direction="right">
                <div>
                  <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6 text-foreground">
                    The drive home is where the round gets replayed
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    Every golfer knows the feeling. Twenty minutes in the car. The round is fresh. You're thinking about that birdie on 7, the three-putt on 14, the way you crushed your driver but couldn't find a fairway.
                  </p>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    This is the most honest conversation you'll have about your golf game all week. The problem? It vanishes the moment you pull into your driveway.
                  </p>
                  <p className="text-lg font-medium text-primary">
                    Post Round Coach captures that ritual and turns it into progress.
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Player DNA Section */}
        <section id="player-dna" className="py-24 md:py-32 bg-gradient-to-br from-background via-primary/5 to-background">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="font-serif text-4xl md:text-6xl font-bold mb-6">
                  Your <span className="text-[#D4AF37]">Player DNA</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  A living profile that evolves with every round. Not just stats — the story of how you actually play golf.
                </p>
              </div>
            </FadeIn>

            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <FadeIn direction="left" delay={0.2}>
                <div className="relative h-[350px] rounded-2xl overflow-hidden shadow-2xl">
                  <Image 
                    src="/player-dna-visual.jpg"
                    alt="Player DNA visualization"
                    fill
                    className="object-cover"
                  />
                </div>
              </FadeIn>

              <FadeIn direction="right" delay={0.2}>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl mb-2">Pattern Recognition</h3>
                      <p className="text-muted-foreground">
                        The AI identifies recurring themes in your game — when you score well, when you struggle, what conditions expose weaknesses.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Brain className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl mb-2">Mental Tendencies</h3>
                      <p className="text-muted-foreground">
                        Where you lose focus. When you play conservative vs aggressive. How you respond to adversity.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl mb-2">Scoring Insights</h3>
                      <p className="text-muted-foreground">
                        Not just where strokes are lost — why they're lost. The AI connects the dots between technical execution and course management.
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* AI Coaching Conversation Section */}
        <section className="py-24 md:py-32 bg-card/50">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="font-serif text-4xl md:text-6xl font-bold mb-6">
                  A conversation, not a questionnaire
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Post Round Coach asks the right questions. You answer naturally. The AI listens, learns, and guides.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8 shadow-xl">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Coach</p>
                      <p className="text-foreground">How did the round feel today?</p>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-end">
                    <div className="flex-1 text-right">
                      <p className="text-sm text-muted-foreground mb-1">You</p>
                      <p className="text-foreground bg-primary/10 rounded-lg p-3 inline-block">
                        Frustrating. I hit the ball well but couldn't get anything going on the greens.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Coach</p>
                      <p className="text-foreground">That's the third round you've mentioned putting struggles. Tell me about the greens — were they faster than you expected?</p>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-end">
                    <div className="flex-1 text-right">
                      <p className="text-sm text-muted-foreground mb-1">You</p>
                      <p className="text-foreground bg-primary/10 rounded-lg p-3 inline-block">
                        Yeah, and I left everything short. Same issue as last week.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                      <Brain className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-accent mb-1">Insight</p>
                      <p className="text-foreground font-medium">
                        Pattern identified: You consistently underestimate green speed on unfamiliar courses. Your Player DNA shows this has cost you 3-4 strokes per round over the last month.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 md:py-32 bg-background">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="font-serif text-4xl md:text-6xl font-bold mb-6">
                  Dead simple. Deeply effective.
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  No manual entry. No forced logging. Just you and the coach.
                </p>
              </div>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-4 gap-8">
              <StaggerItem>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold text-xl mb-3">Finish your round</h3>
                  <p className="text-muted-foreground">
                    Get in the car. Take a breath. Open the app.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold text-xl mb-3">Talk it through</h3>
                  <p className="text-muted-foreground">
                    Voice or text. The coach asks, you answer. 5-10 minutes.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-accent">3</span>
                  </div>
                  <h3 className="font-semibold text-xl mb-3">Get insights</h3>
                  <p className="text-muted-foreground">
                    The AI analyzes, finds patterns, updates your Player DNA.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-accent">4</span>
                  </div>
                  <h3 className="font-semibold text-xl mb-3">Improve faster</h3>
                  <p className="text-muted-foreground">
                    Know exactly what to work on. Track what matters.
                  </p>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-24 md:py-32 bg-card/30">
          <div className="container mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="font-serif text-4xl md:text-6xl font-bold mb-6">
                  Trusted by golfers who take the game seriously
                </h2>
              </div>
            </FadeIn>

            <StaggerContainer className="grid md:grid-cols-3 gap-8">
              <StaggerItem>
                <div className="bg-card border border-border rounded-xl p-8 h-full">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-accent" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed">
                    I've been stuck at a 12 handicap for three years. After two months with Post Round Coach, I'm down to 9.4. It's not magic — it just showed me the patterns I couldn't see on my own.
                  </p>
                  <div>
                    <p className="font-semibold">Marcus Chen</p>
                    <p className="text-sm text-muted-foreground">12 → 9.4 handicap in 8 weeks</p>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="bg-card border border-border rounded-xl p-8 h-full">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-accent" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed">
                    The Player DNA feature is unreal. It identified that I consistently lose strokes on par 5s because I play too aggressive off the tee. Changed my strategy, dropped 4 strokes immediately.
                  </p>
                  <div>
                    <p className="font-semibold">Sarah Mitchell</p>
                    <p className="text-sm text-muted-foreground">6 handicap, competitive amateur</p>
                  </div>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className="bg-card border border-border rounded-xl p-8 h-full">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-accent" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed">
                    I've tried every golf app. This is the only one that actually understands my game. The conversations feel like talking to a real coach who knows my tendencies better than I do.
                  </p>
                  <div>
                    <p className="font-semibold">David Park</p>
                    <p className="text-sm text-muted-foreground">Plays 100+ rounds per year</p>
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 md:py-32 bg-gradient-to-br from-[#0D1B12] via-[#1B5E35]/30 to-[#0D1B12] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/golf-course-aerial.jpg')] bg-cover bg-center opacity-5" />
          
          <div className="container relative z-10 mx-auto px-6 text-center">
            <FadeIn>
              <h2 className="font-serif text-4xl md:text-6xl font-bold mb-6 text-foreground">
                Ready to build your <span className="text-[#D4AF37]">Player DNA</span>?
              </h2>
            </FadeIn>
            
            <FadeIn delay={0.2}>
              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                Join golfers who are turning post-round reflection into measurable improvement.
              </p>
            </FadeIn>
            
            <FadeIn delay={0.4}>
              <Button 
                variant="gold" 
                size="xl" 
                onClick={() => setModalOpen(true)}
                className="shadow-2xl shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 transition-all"
              >
                Start Your Free Round Review
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </FadeIn>

            <FadeIn delay={0.6}>
              <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>5-minute setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <Footer />
      </main>

      <EmailCaptureModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
