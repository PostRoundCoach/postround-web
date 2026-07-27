import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailCaptureModal({ isOpen, onOpenChange }: EmailCaptureModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Capture Email:', { name, email });
    setSubmitted(true);
    setTimeout(() => {
      onOpenChange(false);
      setSubmitted(false);
      setName('');
      setEmail('');
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal text-zinc-100">
            {submitted ? 'Welcome to the Club' : 'Start Your Free Round Review'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {submitted
              ? 'We will be in touch shortly.'
              : 'Enter your details to get early access to Post Round Coach.'}
          </DialogDescription>
        </DialogHeader>

        {!submitted && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">First Name</Label>
              <Input
                id="name"
                placeholder="Ben"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ben@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-primary"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Request Access
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
