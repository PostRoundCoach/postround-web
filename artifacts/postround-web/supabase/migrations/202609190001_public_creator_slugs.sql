ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.creator_profiles
  DROP CONSTRAINT IF EXISTS creator_profiles_slug_format;

ALTER TABLE public.creator_profiles
  ADD CONSTRAINT creator_profiles_slug_format
  CHECK (
    slug IS NULL
    OR (
      char_length(slug) BETWEEN 3 AND 64
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS creator_profiles_slug_unique
  ON public.creator_profiles (slug)
  WHERE slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_public_creator_by_slug(requested_slug text)
RETURNS TABLE (
  display_name text,
  bio text,
  avatar_url text,
  creator_social_accounts jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    cp.display_name,
    cp.bio,
    cp.avatar_url,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'platform', csa.platform,
          'handle', csa.handle,
          'profile_url', csa.profile_url
        )
        ORDER BY csa.platform
      ) FILTER (WHERE csa.id IS NOT NULL),
      '[]'::jsonb
    ) AS creator_social_accounts
  FROM public.creator_profiles AS cp
  LEFT JOIN public.creator_social_accounts AS csa
    ON csa.creator_id = cp.id
  WHERE cp.slug = requested_slug
    AND cp.status = 'active'
  GROUP BY cp.id, cp.display_name, cp.bio, cp.avatar_url;
$$;

REVOKE ALL ON FUNCTION public.get_public_creator_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_creator_by_slug(text) TO anon, authenticated;