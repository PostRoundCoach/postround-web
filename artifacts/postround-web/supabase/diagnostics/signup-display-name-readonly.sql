-- Diagnostic only, NOT a migration. Run against the affected project with an
-- authorized database reader that can inspect pg_catalog.
-- No user rows, credentials, configuration writes, or schema changes.
-- Review function bodies before sharing; redact any embedded secret literals.
BEGIN READ ONLY;

-- Include every custom Auth/profile trigger, not just the historical name:
-- a second initializer or later UPDATE trigger may also write display_name.
SELECT n.nspname AS table_schema, c.relname AS table_name,
       t.tgname AS trigger_name, t.tgenabled AS enabled,
       pg_get_triggerdef(t.oid, true) AS trigger_definition,
       p.oid::regprocedure::text AS function_signature,
       pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND ((n.nspname = 'auth' AND c.relname = 'users')
    OR (n.nspname = 'public' AND c.relname = 'profiles'))
ORDER BY n.nspname, c.relname, t.tgname;

-- Check defaults and generated values without selecting any account data.
SELECT a.attname AS column_name,
       pg_get_expr(d.adbin, d.adrelid) AS default_expression,
       a.attgenerated AS generated_kind
FROM pg_attribute a
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attrelid = 'public.profiles'::regclass
  AND a.attname IN ('id', 'display_name')
  AND NOT a.attisdropped
ORDER BY a.attname;

SELECT schemaname, tablename, rulename, definition
FROM pg_rules
WHERE (schemaname = 'auth' AND tablename = 'users')
   OR (schemaname = 'public' AND tablename = 'profiles')
ORDER BY schemaname, tablename, rulename;

ROLLBACK;
