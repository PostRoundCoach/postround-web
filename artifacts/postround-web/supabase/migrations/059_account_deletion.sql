-- Authoritative account-data cleanup. Supabase Auth deletion is deliberately
-- performed by the API only after this transaction commits successfully.

create or replace function public.delete_own_account_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator_ids uuid[];
  v_round_ids uuid[];
  v_story_ids uuid[];
  v_deleted_rounds integer := 0;
begin
  if p_user_id is null then
    raise exception 'account identity is required';
  end if;

  -- The function is service-role only. Fail closed if any reviewed production
  -- relation is absent rather than reporting a partial cleanup as successful.
  if to_regclass('public.profiles') is null
    or to_regclass('public.rounds') is null
    or to_regclass('public.holes') is null
    or to_regclass('public.content_ideas') is null
    or to_regclass('public.vad_telemetry_events') is null
    or to_regclass('public.creator_profiles') is null
    or to_regclass('public.creator_social_accounts') is null
    or to_regclass('public.story_candidates') is null
    or to_regclass('public.story_permissions') is null
  then
    raise exception 'account deletion schema contract is incomplete';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select coalesce(array_agg(id), '{}'::uuid[])
    into v_creator_ids
    from public.creator_profiles
    where user_id = p_user_id;

  select coalesce(array_agg(id), '{}'::uuid[])
    into v_round_ids
    from public.rounds
    where user_id = p_user_id;

  select coalesce(array_agg(id), '{}'::uuid[])
    into v_story_ids
    from public.story_candidates
    where user_id = p_user_id;

  -- Ideas have no direct user_id. Ownership is proven through the user's round
  -- or story, or through creator_id recorded by the server Story Engine.
  delete from public.content_ideas
   where round_id = any(v_round_ids)
      or story_id = any(v_story_ids)
      or (
        stats_used ? 'creator_id'
        and (stats_used ->> 'creator_id') = any(
          array(select creator_id::text from unnest(v_creator_ids) creator_id)
        )
      );

  -- Remove both player-owned permissions and associations granted to a creator
  -- identity owned by this account. This does not delete another player's story.
  delete from public.story_permissions
   where user_id = p_user_id
      or creator_id = any(v_creator_ids);

  delete from public.story_candidates where user_id = p_user_id;
  delete from public.holes where round_id = any(v_round_ids);
  delete from public.rounds where user_id = p_user_id;
  get diagnostics v_deleted_rounds = row_count;

  delete from public.vad_telemetry_events where user_id = p_user_id;
  delete from public.creator_social_accounts where creator_id = any(v_creator_ids);
  delete from public.creator_profiles where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  -- Intentionally retained:
  -- * waitlist: not account-owned and may represent separate marketing consent.
  -- * admin_audit_log: security/audit history; auth.users FKs use ON DELETE SET NULL.
  return jsonb_build_object(
    'cleaned', true,
    'deleted_rounds', v_deleted_rounds,
    'auth_deletion_required', true
  );
end;
$$;

revoke all on function public.delete_own_account_data(uuid) from public;
revoke all on function public.delete_own_account_data(uuid) from anon;
revoke all on function public.delete_own_account_data(uuid) from authenticated;
grant execute on function public.delete_own_account_data(uuid) to service_role;