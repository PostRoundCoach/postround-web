import Link from 'next/link'
import { Instagram, Twitter, Youtube, Globe, ArrowUpRight, Link as LinkIcon, Facebook, Linkedin } from 'lucide-react'

export interface SocialAccount {
  platform: string
  handle: string
  profileUrl: string
}

export interface PublicCreatorProfileProps {
  referralHref?: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  socialAccounts: SocialAccount[]
}

const platformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <Instagram className="w-5 h-5" />
    case 'twitter':
    case 'x':
      return <Twitter className="w-5 h-5" />
    case 'youtube':
      return <Youtube className="w-5 h-5" />
    case 'facebook':
      return <Facebook className="w-5 h-5" />
    case 'linkedin':
      return <Linkedin className="w-5 h-5" />
    case 'website':
      return <Globe className="w-5 h-5" />
    default:
      return <LinkIcon className="w-5 h-5" />
  }
}

export function PublicCreatorProfile({
  referralHref,
  displayName,
  bio,
  avatarUrl,
  socialAccounts,
}: PublicCreatorProfileProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-[#0D1B12] text-[#E8F5E0] font-sans selection:bg-[#D4AF37]/30 selection:text-white">
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
      `}</style>

      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-[url('/golf-course-aerial.jpg')] bg-cover bg-center opacity-[0.03] mix-blend-overlay pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-[#1B5E35]/15 via-[#1B5E35]/5 to-transparent pointer-events-none" />
      <div className="absolute -top-[20%] -right-[10%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-[#D4AF37]/5 blur-[120px] pointer-events-none" />

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-20 md:py-28 relative z-10 flex flex-col items-center">
        
        {/* Avatar */}
        <div className="animate-fade-in-up opacity-0 stagger-1">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-[#162A1C] flex items-center justify-center ring-4 ring-[#D4AF37]/15 mb-8">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-serif text-[#D4AF37] opacity-90 uppercase tracking-widest">
                {displayName.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Header / Bio */}
        <div className="animate-fade-in-up opacity-0 stagger-2 flex flex-col items-center text-center w-full">
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-white mb-5 text-balance">
            {displayName}
          </h1>
          {bio ? (
            <p className="text-lg md:text-xl text-white/70 max-w-md leading-relaxed mb-12 text-balance">
              {bio}
            </p>
          ) : (
            <div className="h-12" />
          )}
        </div>

        {/* Socials Divider */}
        {socialAccounts.length > 0 && (
          <div className="animate-fade-in-up opacity-0 stagger-3 w-12 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mb-10" />
        )}

        {/* Social Links List */}
        <ul className="w-full space-y-4 animate-fade-in-up opacity-0 stagger-4">
          {socialAccounts.map((social, i) => (
            <li key={`${social.platform}-${social.handle}-${i}`} className="group">
              <a
                href={social.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-[#D4AF37]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#D4AF37]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B12]"
              >
                <div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center text-white/70 group-hover:scale-110 group-hover:bg-[#D4AF37] group-hover:text-[#0D1B12] transition-all duration-300 mr-5 shrink-0 shadow-inner shadow-white/5">
                  {platformIcon(social.platform)}
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40 group-hover:text-[#D4AF37]/80 transition-colors">
                    {social.platform}
                  </span>
                  <span className="text-base md:text-lg font-medium text-white/90 truncate transition-colors group-hover:text-white">
                    {social.handle}
                  </span>
                </div>
                <ArrowUpRight className="w-6 h-6 text-white/20 group-hover:text-[#D4AF37] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300 shrink-0" />
              </a>
            </li>
          ))}

          {socialAccounts.length === 0 && (
            <li className="w-full rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Globe className="w-5 h-5 text-white/30" />
              </div>
              <p className="text-white/40 text-sm tracking-wide">
                No social accounts linked yet.
              </p>
            </li>
          )}
        </ul>
      </main>

      <footer className="w-full px-6 pb-10 mt-auto relative z-10 animate-fade-in-up opacity-0 stagger-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 border-t border-white/10 pt-10 text-center">
          <p className="max-w-md text-sm leading-relaxed text-white/50">
            Capture your round, learn from every moment, and share the stories that made it yours.
          </p>
          {referralHref && <Link
            href={referralHref}
            className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#0D1B12] transition hover:bg-[#e2c35a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Get Post Round with this creator
          </Link>}
          <Link
            href="/"
            className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#0D1B12] transition hover:-translate-y-0.5 hover:bg-[#e2c35a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Discover Post Round
          </Link>
          <Link
            href="/"
            className="group flex flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg p-2"
          >
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30 group-hover:text-white/50 transition-colors">
            Powered by
          </span>
          <span className="font-serif text-sm font-bold uppercase tracking-[0.22em] text-white/70 group-hover:text-[#D4AF37] transition-colors">
            Post Round
          </span>
          </Link>
        </div>
      </footer>
    </div>
  )
}
