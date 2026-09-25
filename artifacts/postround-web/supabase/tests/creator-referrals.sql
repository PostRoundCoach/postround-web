-- Run with psql -v ON_ERROR_STOP=1 -f supabase/tests/creator-referrals.sql
-- ONLY against a reviewed, migrated non-production Supabase clone.
-- All fixtures and writes roll back. Requires the migration/apply role.
BEGIN;
SELECT gen_random_uuid() AS player_a, gen_random_uuid() AS player_b,
       gen_random_uuid() AS creator_a, gen_random_uuid() AS creator_b \gset
INSERT INTO auth.users (id, instance_id, aud, role)
VALUES (:'player_a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
       (:'player_b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
INSERT INTO public.profiles (id) VALUES (:'player_a'), (:'player_b') ON CONFLICT DO NOTHING;
INSERT INTO public.creator_profiles (id, display_name, slug, status)
VALUES (:'creator_a', 'Referral Fixture A', 'referral-fixture-a', 'active'),
       (:'creator_b', 'Referral Fixture B', 'referral-fixture-b', 'active');

SET LOCAL ROLE anon;
SELECT public.issue_creator_referral('referral-fixture-a', 'web') AS evidence_a \gset
SELECT public.issue_creator_referral('referral-fixture-b', 'web') AS evidence_b \gset
DO $$
BEGIN
  IF public.issue_creator_referral('not-a-creator', 'web') IS NOT NULL
    OR public.issue_creator_referral('INVALID', 'web') IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid slug issued evidence';
  END IF;
END;
$$;
RESET ROLE;
UPDATE public.creator_profiles SET status = 'inactive' WHERE id = :'creator_b';
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF public.issue_creator_referral('referral-fixture-b', 'web') IS NOT NULL THEN
    RAISE EXCEPTION 'Inactive creator issued evidence';
  END IF;
END;
$$;
RESET ROLE;
UPDATE public.creator_profiles SET status = 'active' WHERE id = :'creator_b';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_a', true);
SELECT set_config('test.evidence_a', :'evidence_a', true);
SELECT public.claim_creator_referral(:'evidence_a', 'web_referral');
SELECT public.claim_creator_referral(:'evidence_a', 'web_referral');
SELECT public.claim_creator_referral(:'evidence_b', 'web_referral');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.creator_attributions WHERE user_id = auth.uid()) <> 1 THEN
    RAISE EXCEPTION 'Claim is not idempotent';
  END IF;
  BEGIN
    PERFORM public.claim_creator_referral(gen_random_uuid(), 'web_referral');
    RAISE EXCEPTION 'Tampered token accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    INSERT INTO public.creator_attributions (user_id, creator_id, referral_link_id, referral_event_id,
      platform, attribution_method, campaign)
      VALUES (auth.uid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        'web', 'web_referral', 'creator_referral');
    RAISE EXCEPTION 'Direct client insert accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.creator_attributions WHERE user_id = auth.uid();
    RAISE EXCEPTION 'Direct client delete accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

-- Privileged direct edits still hit the immutability trigger.
SELECT set_config('test.player_a', :'player_a', true);
DO $$
BEGIN
  BEGIN
    UPDATE public.creator_attributions SET campaign = 'changed'
      WHERE user_id = current_setting('test.player_a', true)::uuid;
    RAISE EXCEPTION 'Original attribution was editable';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Original creator attribution cannot be changed' THEN RAISE; END IF;
  END;
END;
$$;

-- Expiry is checked before insertion for a user without an attribution.
UPDATE public.creator_referral_events
  SET occurred_at = now() - interval '40 days', expires_at = now() - interval '1 day'
  WHERE id IN (:'evidence_a', :'evidence_b');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_b', true);
SELECT set_config('test.evidence_b', :'evidence_b', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.claim_creator_referral(current_setting('test.evidence_b')::uuid, 'web_referral');
    RAISE EXCEPTION 'Expired evidence accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
END;
$$;
SELECT set_config('request.jwt.claim.sub', :'player_a', true);
SELECT public.claim_creator_referral(:'evidence_a', 'web_referral');
RESET ROLE;

-- The unique user_id and event_id constraints are also the cross-session
-- concurrency barriers; exercise two simultaneous sessions on this clone
-- before production application (see ../creator-referrals.md).
ROLLBACK;