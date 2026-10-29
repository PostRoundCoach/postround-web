-- Read-only verification, using existing authorized SQL access.
-- Run before and after separately approved application; no account rows read.
SELECT pg_get_functiondef(p.oid) AS function_definition,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       pg_get_userbyid(p.proowner) AS function_owner,
       (
         SELECT jsonb_agg(jsonb_build_object(
           'trigger_name', t.tgname,
           'enabled', t.tgenabled,
           'definition', pg_get_triggerdef(t.oid, true)
         ) ORDER BY t.tgname)
         FROM pg_trigger t
         WHERE t.tgfoid = p.oid
           AND t.tgrelid = 'auth.users'::regclass
           AND NOT t.tgisinternal
       ) AS auth_triggers
FROM pg_proc p
WHERE p.oid = 'public.handle_new_user()'::regprocedure;
