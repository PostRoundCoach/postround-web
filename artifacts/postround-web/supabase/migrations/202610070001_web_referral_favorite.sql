-- Function-only amendment. Review/apply workflow: ../README.md.
-- Requires reconciled creator identity and referral baselines; no backfill.
CREATE OR REPLACE FUNCTION public.claim_creator_referral(evidence_id uuid, claim_method text DEFAULT 'web_referral')
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
  IF FOUND THEN
    IF claim_method = 'web_referral' THEN
      UPDATE public.profiles p SET favorite_creator_id = a.creator_id
        FROM public.creator_attributions a
        WHERE p.id = claimant AND a.user_id = claimant
          AND p.favorite_creator_id IS NULL;
    END IF;
    RETURN;
  END IF;
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
  -- Fresh insertion and insert-conflict returns use the persisted original,
  -- never found_event.creator_id. A write error aborts the whole transaction.
  IF claim_method = 'web_referral' THEN
    UPDATE public.profiles p SET favorite_creator_id = a.creator_id
      FROM public.creator_attributions a
      WHERE p.id = claimant AND a.user_id = claimant
        AND p.favorite_creator_id IS NULL
        -- Preserve the RPC's original return on conflict, but another user's
        -- consumed evidence cannot authorize a new favorite write.
        AND NOT EXISTS (SELECT 1 FROM public.creator_attributions used
          WHERE used.referral_event_id = evidence_id AND used.user_id <> claimant);
  END IF;
  RETURN QUERY SELECT a.creator_id, a.attributed_at FROM public.creator_attributions a
    WHERE a.user_id = claimant;
END;
$$;
-- CREATE OR REPLACE retains ownership and existing authenticated-only grants.
