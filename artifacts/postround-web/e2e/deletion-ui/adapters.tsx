import type { ReactNode } from 'react'

declare global {
  interface Window {
    deletionFixture: {
      cleanup: 'normal' | 'returned' | 'thrown' | 'pending'
      navigation: 'normal' | 'thrown' | 'rejected'
      session: boolean
      cleanupCalls: number
      scope?: string
      releaseCleanup?: () => void
    }
  }
}

export function createClient() {
  return {
    auth: {
      async getSession() {
        return {
          data: { session: window.deletionFixture.session ? {
            access_token: 'isolated-fixture-token',
            user: { email: 'player@example.test' },
          } : null },
          error: null,
        }
      },
      async signOut(options: { scope: string }) {
        const fixture = window.deletionFixture
        fixture.cleanupCalls++
        fixture.scope = options.scope
        if (fixture.cleanup === 'pending') {
          await new Promise<void>((resolve) => { fixture.releaseCleanup = resolve })
        }
        if (fixture.cleanup === 'thrown') throw new Error('private thrown SDK detail')
        return { error: fixture.cleanup === 'returned' ? new Error('private returned SDK detail') : null }
      },
    },
  }
}

export function useRouter() {
  return {
    push() {
      if (window.deletionFixture.navigation === 'thrown') throw new Error('private navigation detail')
      if (window.deletionFixture.navigation === 'rejected') return Promise.reject(new Error('private navigation detail'))
      window.location.assign('/')
    },
  }
}

export default function Link({ children, ...props }: { children: ReactNode; href: string; className?: string }) {
  return <a {...props}>{children}</a>
}
