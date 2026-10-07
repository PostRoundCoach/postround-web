-- ONLY an explicitly approved, migrated non-production Supabase clone.
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/web-referral-favorite.sql
-- All data, triggers, and test helpers roll back. Run as migration/apply role.
BEGIN;
SELECT gen_random_uuid() AS player_a, gen_random_uuid() AS player_b,
       gen_random_uuid() AS player_c, gen_random_uuid() AS player_native,
       gen_random_uuid() AS creator_a, gen_random_uuid() AS creator_b \gset
INSERT INTO auth.users (id, instance_id, aud, role)
VALUES (:'player_a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
       (:'player_b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
       (:'player_c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
       (:'player_native', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
INSERT INTO public.profiles (id)
VALUES (:'player_a'), (:'player_b'), (:'player_c'), (:'player_native') ON CONFLICT DO NOTHING;
INSERT INTO public.creator_profiles (id, display_name, slug, status)
VALUES (:'creator_a', 'Favorite Fixture A', 'favorite-fixture-a', 'active'),
       (:'creator_b', 'Favorite Fixture B', 'favorite-fixture-b', 'active');
UPDATE public.profiles SET favorite_creator_id = :'creator_b' WHERE id = :'player_b';
SELECT set_config('test.player_a', :'player_a', true),
       set_config('test.player_c', :'player_c', true),
       set_config('test.creator_a', :'creator_a', true),
       set_config('test.creator_b', :'creator_b', true);
CREATE FUNCTION pg_temp.assert_favorite(player uuid, expected uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
      WHERE id = player AND favorite_creator_id IS NOT DISTINCT FROM expected) THEN
    RAISE EXCEPTION 'Favorite mismatch for %', player;
  END IF;
END;
$$;
-- Count actual writes, including retries, rather than just final values.
CREATE TEMP TABLE favorite_writes (player uuid);
CREATE FUNCTION pg_temp.count_favorite_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO pg_temp.favorite_writes VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER test_count_favorite_write AFTER UPDATE OF favorite_creator_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION pg_temp.count_favorite_write();

SET LOCAL ROLE anon;
SELECT public.issue_creator_referral('favorite-fixture-a', 'web') AS evidence_a \gset
SELECT public.issue_creator_referral('favorite-fixture-a', 'web') AS evidence_b \gset
SELECT public.issue_creator_referral('favorite-fixture-b', 'web') AS evidence_later \gset
SELECT public.issue_creator_referral('favorite-fixture-a', 'android') AS evidence_native \gset
SELECT public.issue_creator_referral('favorite-fixture-a', 'web') AS evidence_failure \gset
RESET ROLE;
SELECT set_config('test.evidence_a', :'evidence_a', true),
       set_config('test.evidence_failure', :'evidence_failure', true);

-- A and D: fresh web attribution sets the favorite once; repeat is no-op.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_a', true);
SELECT public.claim_creator_referral(:'evidence_a', 'web_referral');
SELECT public.claim_creator_referral(:'evidence_a', 'web_referral');
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_a', :'creator_a');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.creator_attributions
      WHERE user_id = current_setting('test.player_a')::uuid) <> 1
    OR (SELECT count(*) FROM pg_temp.favorite_writes
      WHERE player = current_setting('test.player_a')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Duplicate attribution or unnecessary favorite write';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.creator_attributions
      WHERE user_id = current_setting('test.player_a')::uuid
      AND attribution_method = 'web_referral' AND attribution_source = 'creator_referral'
      AND referral_event_id = current_setting('test.evidence_a')::uuid) THEN
    RAISE EXCEPTION 'Original attribution semantics changed';
  END IF;
END;
$$;
-- B: an intentional conflicting favorite survives initial claim and retry.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_b', true);
SELECT public.claim_creator_referral(:'evidence_b', 'web_referral');
SELECT public.claim_creator_referral(:'evidence_b', 'web_referral');
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_b', :'creator_b');
SELECT set_config('test.player_b', :'player_b', true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_temp.favorite_writes
      WHERE player = current_setting('test.player_b')::uuid) THEN
    RAISE EXCEPTION 'Existing favorite was written';
  END IF;
END;
$$;
-- A claimant with an original attribution cannot use another player's consumed
-- event to populate a NULL favorite, even though the legacy return stays original.
UPDATE public.profiles SET favorite_creator_id = NULL WHERE id = :'player_a';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_a', true);
SELECT public.claim_creator_referral(:'evidence_b', 'web_referral');
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_a', NULL);
-- Later valid evidence hits insert-conflict return, but supplies no favorite.
UPDATE public.profiles SET favorite_creator_id = NULL WHERE id = :'player_a';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_a', true);
SELECT public.claim_creator_referral(:'evidence_later', 'web_referral');
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_a', :'creator_a');
-- Established claim retries still propagate after expiry and deactivation.
UPDATE public.profiles SET favorite_creator_id = NULL WHERE id = :'player_a';
UPDATE public.creator_referral_events
  SET occurred_at = now() - interval '40 days', expires_at = now() - interval '1 day'
  WHERE id = :'evidence_a';
UPDATE public.creator_profiles SET status = 'inactive' WHERE id = :'creator_a';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_a', true);
SELECT public.claim_creator_referral(:'evidence_a', 'web_referral');
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_a', :'creator_a');
UPDATE public.creator_profiles SET status = 'active' WHERE id = :'creator_a';
-- C and evidence security: no attribution, NULL remains NULL on rejected evidence.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_c', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.claim_creator_referral(gen_random_uuid(), 'web_referral');
    RAISE EXCEPTION 'Unknown evidence accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.claim_creator_referral(current_setting('test.evidence_a')::uuid, 'web_referral');
    RAISE EXCEPTION 'Expired other-user evidence accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
END;
$$;
-- Consumed but unexpired evidence returns empty without a profile write.
SELECT set_config('test.evidence_b', :'evidence_b', true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.claim_creator_referral(
      current_setting('test.evidence_b')::uuid, 'web_referral')) THEN
    RAISE EXCEPTION 'Other-user consumed evidence accepted';
  END IF;
  BEGIN
    PERFORM public.claim_creator_referral(current_setting('test.evidence_b')::uuid, 'android_install_referrer');
    RAISE EXCEPTION 'Web evidence accepted for native claim';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
END;
$$;
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_c', NULL);
-- Native method still attributes but does not default a favorite.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_native', true);
SELECT public.claim_creator_referral(:'evidence_native', 'android_install_referrer');
SELECT public.claim_creator_referral(:'evidence_native', 'android_install_referrer');
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_native', NULL);

-- A failed profile write rolls back the fresh attribution; retry is safe.
CREATE FUNCTION pg_temp.reject_favorite_write() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.id = current_setting('test.player_c')::uuid THEN
    RAISE EXCEPTION 'fixture profile write failure';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER test_reject_favorite_write BEFORE UPDATE OF favorite_creator_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_favorite_write();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'player_c', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.claim_creator_referral(current_setting('test.evidence_failure')::uuid, 'web_referral');
    RAISE EXCEPTION 'Profile failure silently ignored';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'fixture profile write failure' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.creator_attributions WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Failed profile write left attribution behind';
  END IF;
END;
$$;
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_c', NULL);
DROP TRIGGER test_reject_favorite_write ON public.profiles;
SET LOCAL ROLE authenticated;
SELECT public.claim_creator_referral(:'evidence_failure', 'web_referral');
RESET ROLE;
SELECT pg_temp.assert_favorite(:'player_c', :'creator_a');
-- No JWT still fails before touching any profile.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.claim_creator_referral(gen_random_uuid(), 'web_referral');
    RAISE EXCEPTION 'Unauthenticated claim accepted';
  EXCEPTION WHEN SQLSTATE '28000' THEN NULL;
  END;
END;
$$;
RESET ROLE;
-- Separate cross-session acceptance is documented in ../web-referral-favorite.md.
ROLLBACK;
