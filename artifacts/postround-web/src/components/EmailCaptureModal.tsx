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
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Email capture:', { name, email })
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setName('')
      setEmail('')
      onOpenChange(false)
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Start Your Free Round Review</DialogTitle>
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
                />
              </div>
              <Button type="submit" variant="gold" size="lg" className="w-full">
                Get Early Access
              </Button>
            </form>
          </>
        ) : (
          <div className="py-8 text-center">
            <DialogTitle className="text-2xl font-serif mb-2">Welcome to the club</DialogTitle>
            <DialogDescription>
              Check your email — we'll be in touch soon with your early access invite.
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
