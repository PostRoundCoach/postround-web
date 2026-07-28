"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface EmailCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmailCaptureModal({ open, onOpenChange }: EmailCaptureModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })

      const data = await res.json()

      if (!res.ok) {
        // 409 = already on list — treat as success with a different message
        if (res.status === 409) {
          setSubmitted(true)
        } else {
          setError(data.error ?? 'Something went wrong — please try again.')
        }
        return
      }

      setSubmitted(true)
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (open: boolean) => {
    // Reset state when modal closes
    if (!open) {
      setTimeout(() => {
        setName('')
        setEmail('')
        setError(null)
        setSubmitted(false)
        setLoading(false)
      }, 300) // wait for close animation
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Add me to Launch List</DialogTitle>
              <DialogDescription>
                Get early access to Post Round Coach and transform your drive home into the most productive part of your golf game.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Joining...' : 'Get Early Access'}
              </Button>
            </form>
          </>
        ) : (
          <div className="py-8 text-center space-y-2">
            <DialogTitle className="text-2xl font-serif">Welcome to the club</DialogTitle>
            <DialogDescription>
              You&apos;re on the list. We&apos;ll be in touch soon with your early access invite.
            </DialogDescription>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => handleClose(false)}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
