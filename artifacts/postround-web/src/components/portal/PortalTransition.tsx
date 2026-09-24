'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const DELAY_MS = 200
const SAFETY_TIMEOUT_MS = 20000

type Transition = {
  begin: (destination?: string, onTimeout?: () => void) => boolean
  end: () => void
}

const Context = createContext<Transition | null>(null)

export function PortalLoadingIndicator({ fallback = false }: { fallback?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading page"
      data-testid="portal-transition-loading"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#0D1B12]/60 ${fallback ? 'portal-loading-delay' : ''}`}
    >
      <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#162A1C] px-6 py-4 text-sm font-medium text-white shadow-xl">
        <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" aria-hidden="true" />
        Loading…
      </div>
    </div>
  )
}

export function PortalTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const previousPath = useRef(pathname)
  const pending = useRef<string | null>(null)
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutCallback = useRef<(() => void) | null>(null)
  const snapshot = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  const end = useCallback(() => {
    pending.current = null
    timeoutCallback.current = null
    if (delay.current) clearTimeout(delay.current)
    if (safety.current) clearTimeout(safety.current)
    delay.current = null
    safety.current = null
    setVisible(false)
    snapshot.current?.remove()
    snapshot.current = null
  }, [])

  const begin = useCallback((destination?: string, onTimeout?: () => void) => {
    if (pending.current !== null) return false
    pending.current = destination ?? '__sign-in__'
    timeoutCallback.current = onTimeout ?? null
    // A Next loading boundary can replace the old route while its server component
    // resolves. Retain its visual shell behind the indicator until the new shell mounts.
    const page = document.querySelector<HTMLElement>('body > div:not([hidden]):not([data-portal-snapshot])')
    if (page) {
      const copy = page.cloneNode(true) as HTMLElement
      copy.setAttribute('data-portal-snapshot', '')
      copy.setAttribute('aria-hidden', 'true')
      copy.inert = true
      copy.querySelectorAll('[data-testid]').forEach((node) => node.removeAttribute('data-testid'))
      copy.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((field) => {
        field.value = ''
        field.removeAttribute('value')
      })
      Object.assign(copy.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '90',
        overflow: 'auto',
        pointerEvents: 'none',
      })
      document.body.appendChild(copy)
      copy.scrollTop = window.scrollY
      snapshot.current = copy
    }
    delay.current = setTimeout(() => setVisible(true), DELAY_MS)
    // Next's router has no failure event. Never strand an interactive page indefinitely.
    safety.current = setTimeout(() => {
      const callback = timeoutCallback.current
      end()
      callback?.()
    }, SAFETY_TIMEOUT_MS)
    return true
  }, [end])

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname
      // A different destination means a redirect (or browser navigation).
      // The expected page calls PortalTransitionReady once its shell is usable.
      if (pending.current && pending.current !== pathname) end()
    }
  }, [pathname, end])

  useEffect(() => {
    window.addEventListener('popstate', end)
    return () => {
      window.removeEventListener('popstate', end)
      if (delay.current) clearTimeout(delay.current)
      if (safety.current) clearTimeout(safety.current)
      snapshot.current?.remove()
    }
  }, [end])

  return (
    <Context.Provider value={{ begin, end }}>
      {children}
      {visible && <PortalLoadingIndicator />}
    </Context.Provider>
  )
}

export function usePortalTransition() {
  const value = useContext(Context)
  if (!value) throw new Error('Portal transition requires its provider')
  return value
}

export function PortalTransitionReady({ path }: { path: string }) {
  const { end } = usePortalTransition()
  const pathname = usePathname()
  useEffect(() => {
    if (pathname === path) end()
  }, [pathname, path, end])
  return null
}

export function PortalTransitionLink({
  href,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: '/creator' | '/dashboard' }) {
  const { begin } = usePortalTransition()
  const pathname = usePathname()
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || pathname === href) return
    if (!begin(href)) event.preventDefault()
  }
  return <Link href={href} prefetch={false} className={className} onClick={handleClick} {...props}>{children}</Link>
}