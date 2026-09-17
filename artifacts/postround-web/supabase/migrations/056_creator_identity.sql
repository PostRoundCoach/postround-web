-- Recovered historical migration: 056_creator_identity.sql
-- Preserved for provenance. See ../README.md before applying legacy files.

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name  text NOT NULL,
  bio           text,
  avatar_url    text,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active creators"
  ON public.creator_profiles FOR SELECT TO authenticated
  USING (status = 'active');

CREATE POLICY "Creator owner can update own profile"
  ON public.creator_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.creator_social_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  platform    text NOT NULL,
  handle      text NOT NULL,
  profile_url text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform)
);

ALTER TABLE public.creator_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active creator social accounts"
  ON public.creator_social_accounts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.status = 'active'
    )
  );

CREATE POLICY "Creator owner can insert own social accounts"
  ON public.creator_social_accounts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator owner can update own social accounts"
  ON public.creator_social_accounts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator owner can delete own social accounts"
  ON public.creator_social_accounts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
  );

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_creator_id uuid
    REFERENCES public.creator_profiles(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND subscription_plan = (SELECT p.subscription_plan FROM public.profiles p WHERE p.id = auth.uid())
    AND subscription_status = (SELECT p.subscription_status FROM public.profiles p WHERE p.id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.id = auth.uid())
    AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT p.stripe_subscription_id FROM public.profiles p WHERE p.id = auth.uid())
    AND current_period_end IS NOT DISTINCT FROM (SELECT p.current_period_end FROM public.profiles p WHERE p.id = auth.uid())
    AND subscription_currency IS NOT DISTINCT FROM (SELECT p.subscription_currency FROM public.profiles p WHERE p.id = auth.uid())
  );