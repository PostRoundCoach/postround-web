-- Recovered historical migration: 057_story_candidates.sql
-- Preserved for provenance. See ../README.md before applying legacy files.

CREATE TABLE IF NOT EXISTS public.story_candidates (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id           uuid        NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_type         text        NOT NULL,
  significance_score integer     NOT NULL CHECK (significance_score BETWEEN 0 AND 100),
  headline           text        NOT NULL,
  summary            text        NOT NULL,
  story_data         jsonb       NOT NULL DEFAULT '{}',
  status             text        NOT NULL DEFAULT 'candidate'
                                   CHECK (status IN ('candidate', 'offered', 'shared', 'kept_private', 'expired')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id)
);

ALTER TABLE public.story_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own story candidates"
  ON public.story_candidates FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own story candidates"
  ON public.story_candidates FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE UPDATE ON public.story_candidates FROM authenticated;
GRANT UPDATE (status) ON public.story_candidates TO authenticated;

CREATE TABLE IF NOT EXISTS public.story_permissions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id           uuid        NOT NULL REFERENCES public.story_candidates(id) ON DELETE CASCADE,
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id         uuid        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  permission_granted boolean     NOT NULL DEFAULT false,
  granted_at         timestamptz,
  revoked_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.story_permissions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS story_permissions_one_active_creator
  ON public.story_permissions (story_id)
  WHERE permission_granted = true AND revoked_at IS NULL;

CREATE POLICY "Users can view own story permissions"
  ON public.story_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own story permissions"
  ON public.story_permissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Creators can view their own permissions"
  ON public.story_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can view permitted story candidates"
  ON public.story_candidates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.story_permissions sp
      JOIN public.creator_profiles cp ON cp.id = sp.creator_id
      WHERE sp.story_id = story_candidates.id
        AND cp.user_id = auth.uid()
        AND sp.permission_granted = true
        AND sp.revoked_at IS NULL
    )
  );