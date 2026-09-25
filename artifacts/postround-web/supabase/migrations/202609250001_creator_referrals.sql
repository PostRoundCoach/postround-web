-- Apply only through the reviewed migration workflow in ../README.md.
-- Link IDs, not mutable public slugs, are the stable referral identifiers.
CREATE TABLE public.creator_referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.protect_creator_referral_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.slug IS DISTINCT FROM NEW.slug
     AND EXISTS (SELECT 1 FROM public.creator_referral_links WHERE creator_id = OLD.id)
     AND current_setting('postround.account_erasure', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Issued creator referral URLs cannot be renamed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_creator_referral_slug
  BEFORE UPDATE OF slug ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_creator_referral_slug();

CREATE TABLE public.creator_referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id uuid NOT NULL REFERENCES public.creator_referral_links(id) ON DELETE RESTRICT,
  platform text NOT NULL CHECK (platform IN ('web', 'android', 'ios', 'unknown')),
  campaign text NOT NULL DEFAULT 'creator_referral',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  CHECK (expires_at > occurred_at)
);
CREATE INDEX creator_referral_events_link_time_idx
  ON public.creator_referral_events (referral_link_id, occurred_at DESC);

CREATE TABLE public.creator_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
  referral_link_id uuid NOT NULL REFERENCES public.creator_referral_links(id) ON DELETE RESTRICT,
  referral_event_id uuid NOT NULL UNIQUE REFERENCES public.creator_referral_events(id) ON DELETE RESTRICT,
  platform text NOT NULL CHECK (platform IN ('web', 'android', 'ios', 'unknown')),
  attribution_method text NOT NULL CHECK (attribution_method IN ('web_referral', 'android_install_referrer')),
  attribution_source text NOT NULL DEFAULT 'creator_referral',
  campaign text NOT NULL,
  attributed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX creator_attributions_creator_idx ON public.creator_attributions (creator_id, attributed_at);

CREATE FUNCTION public.prevent_creator_attribution_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Account erasure is the sole exception; clients cannot write this table.
  IF TG_OP = 'DELETE' AND current_setting('postround.account_erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Original creator attribution cannot be changed';
END;
$$;
CREATE TRIGGER creator_attribution_immutable
  BEFORE UPDATE OR DELETE ON public.creator_attributions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_attribution_mutation();

ALTER TABLE public.creator_referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_attributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creator_referral_links, public.creator_referral_events, public.creator_attributions FROM anon, authenticated;
GRANT SELECT ON public.creator_attributions TO authenticated;
CREATE POLICY "Users read only their original attribution"
  ON public.creator_attributions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- The anonymous click creates evidence only. It does not attribute a user.
CREATE FUNCTION public.issue_creator_referral(requested_slug text, requested_platform text DEFAULT 'web')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  creator uuid;
  link uuid;
  evidence uuid;
BEGIN
  IF requested_slug IS NULL OR char_length(requested_slug) NOT BETWEEN 3 AND 64
     OR requested_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     OR requested_platform NOT IN ('web', 'android', 'ios', 'unknown') THEN
    RETURN NULL;
  END IF;
  SELECT id INTO creator FROM public.creator_profiles
    WHERE slug = requested_slug AND status = 'active';
  IF creator IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.creator_referral_links (creator_id) VALUES (creator)
    ON CONFLICT (creator_id) DO UPDATE SET creator_id = EXCLUDED.creator_id
    RETURNING id INTO link;
  INSERT INTO public.creator_referral_events (referral_link_id, platform)
    VALUES (link, requested_platform) RETURNING id INTO evidence;
  RETURN evidence;
END;
$$;

-- Auth identity is read from the verified JWT, never an input parameter.
-- A consumed event cannot be attributed to another user. Concurrent requests
-- for one user race on the unique user_id and return the established row.
CREATE FUNCTION public.claim_creator_referral(evidence_id uuid, claim_method text DEFAULT 'web_referral')
RETURNS TABLE (creator_id uuid, attributed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  found_event record;
  claimant uuid := auth.uid();
BEGIN
  IF claimant IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  IF evidence_id IS NULL OR claim_method NOT IN ('web_referral', 'android_install_referrer') THEN
    RAISE EXCEPTION 'Invalid referral evidence' USING ERRCODE = '22023';
  END IF;
  -- An established claim stays retryable even after its click expires or
  -- the creator is subsequently deactivated.
  RETURN QUERY SELECT a.creator_id, a.attributed_at FROM public.creator_attributions a
    WHERE a.user_id = claimant AND a.referral_event_id = evidence_id;
  IF FOUND THEN RETURN; END IF;
  SELECT e.id, e.referral_link_id, e.platform, e.campaign, l.creator_id
    INTO found_event
    FROM public.creator_referral_events e
    JOIN public.creator_referral_links l ON l.id = e.referral_link_id
    JOIN public.creator_profiles cp ON cp.id = l.creator_id
    WHERE e.id = evidence_id AND e.expires_at > now() AND cp.status = 'active';
  IF NOT FOUND OR (claim_method = 'android_install_referrer' AND found_event.platform <> 'android') THEN
    RAISE EXCEPTION 'Invalid or expired referral evidence' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.creator_attributions
    (user_id, creator_id, referral_link_id, referral_event_id, platform, attribution_method, campaign)
    VALUES (claimant, found_event.creator_id, found_event.referral_link_id,
            found_event.id, found_event.platform, claim_method, found_event.campaign)
    ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT a.creator_id, a.attributed_at FROM public.creator_attributions a
    WHERE a.user_id = claimant;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_creator_referral(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_creator_referral(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_creator_referral(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_creator_referral(uuid, text) TO authenticated;

-- Preserve the existing service-only account deletion flow. A referred player
-- must be erased before their profile FK is removed; a creator with historical
-- referrals is detached/anonymized instead of deleting the referenced identity.
CREATE OR REPLACE FUNCTION public.delete_own_account_data(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_creator_ids uuid[];
  v_round_ids uuid[];
  v_story_ids uuid[];
  v_deleted_rounds integer := 0;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'account identity is required'; END IF;
  IF to_regclass('public.profiles') IS NULL OR to_regclass('public.rounds') IS NULL
    OR to_regclass('public.holes') IS NULL OR to_regclass('public.content_ideas') IS NULL
    OR to_regclass('public.vad_telemetry_events') IS NULL
    OR to_regclass('public.creator_profiles') IS NULL
    OR to_regclass('public.creator_social_accounts') IS NULL
    OR to_regclass('public.story_candidates') IS NULL
    OR to_regclass('public.story_permissions') IS NULL
    OR to_regclass('public.creator_attributions') IS NULL
  THEN RAISE EXCEPTION 'account deletion schema contract is incomplete'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_creator_ids
    FROM public.creator_profiles WHERE user_id = p_user_id;
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_round_ids
    FROM public.rounds WHERE user_id = p_user_id;
  SELECT coalesce(array_agg(id), '{}'::uuid[]) INTO v_story_ids
    FROM public.story_candidates WHERE user_id = p_user_id;
  DELETE FROM public.content_ideas
    WHERE round_id = any(v_round_ids) OR story_id = any(v_story_ids)
      OR (stats_used ? 'creator_id' AND (stats_used ->> 'creator_id') = any(
        array(SELECT creator_id::text FROM unnest(v_creator_ids) creator_id)));
  DELETE FROM public.story_permissions
    WHERE user_id = p_user_id OR creator_id = any(v_creator_ids);
  DELETE FROM public.story_candidates WHERE user_id = p_user_id;
  DELETE FROM public.holes WHERE round_id = any(v_round_ids);
  DELETE FROM public.rounds WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_rounds = ROW_COUNT;
  DELETE FROM public.vad_telemetry_events WHERE user_id = p_user_id;
  DELETE FROM public.creator_social_accounts WHERE creator_id = any(v_creator_ids);

  -- The flag is transaction-local and the RPC is executable only by service_role.
  PERFORM set_config('postround.account_erasure', 'on', true);
  DELETE FROM public.creator_attributions WHERE user_id = p_user_id;
  UPDATE public.creator_profiles
    SET user_id = NULL, status = 'inactive', slug = NULL,
        display_name = 'Former creator', bio = NULL, avatar_url = NULL
    WHERE user_id = p_user_id
      AND id IN (SELECT creator_id FROM public.creator_referral_links);
  DELETE FROM public.creator_profiles WHERE user_id = p_user_id;
  PERFORM set_config('postround.account_erasure', 'off', true);
  DELETE FROM public.profiles WHERE id = p_user_id;
  RETURN jsonb_build_object('cleaned', true, 'deleted_rounds', v_deleted_rounds,
    'auth_deletion_required', true);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_own_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account_data(uuid) TO service_role;