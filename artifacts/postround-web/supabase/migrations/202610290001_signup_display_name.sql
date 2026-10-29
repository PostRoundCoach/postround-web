-- Prepared from the owner-supplied deployed handle_new_user() definition.
-- Apply only after explicit owner approval, using the existing migration workflow.
-- Function-only correction: no trigger replacement, schema changes or backfill.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(
            nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
            new.raw_user_meta_data->>'full_name',
            new.email
        ),
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$function$;
