-- Waitlist table for Post Round Coach early access signups
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

create table if not exists public.waitlist (
  id          uuid        default gen_random_uuid() primary key,
  name        text        not null,
  email       text        not null,
  created_at  timestamptz default now() not null,
  constraint waitlist_email_unique unique (email)
);

-- Enable Row Level Security
alter table public.waitlist enable row level security;

-- Anyone can sign up (no auth required)
create policy "Allow public insert"
  on public.waitlist
  for insert
  with check (true);

-- Only authenticated users (admins) can read the list
create policy "Allow authenticated read"
  on public.waitlist
  for select
  using (auth.role() = 'authenticated');
