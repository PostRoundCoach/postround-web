-- Historical follow-on to 057_story_candidates.sql.
ALTER TABLE public.story_permissions
  ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz;