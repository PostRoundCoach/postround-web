import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Source-contract checks only: no database access, account creation or claim
// that these tests prove live signup/profile persistence.
const sql = readFileSync(
  new URL('../../../supabase/migrations/202610290001_signup_display_name.sql', import.meta.url),
  'utf8',
)
const withoutComments = sql.replace(/^--.*$/gm, '').trim()
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
// Full deployed initializer supplied by the owner from pg_get_functiondef.
const observed = `CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.email),
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$function$;`

test('migration changes only the name expression in the supplied deployed definition', () => {
  const expected = observed.replace(
    "coalesce(new.raw_user_meta_data->>'full_name', new.email)",
    `coalesce(
      nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
      new.raw_user_meta_data->>'full_name',
      new.email
    )`,
  )
  assert.equal(normalize(withoutComments), normalize(expected))
})

test('valid trimmed display_name takes priority with unchanged full_name/email fallback', () => {
  assert.match(withoutComments, /coalesce\(\s*nullif\(btrim\(new\.raw_user_meta_data->>'display_name'\), ''\),\s*new\.raw_user_meta_data->>'full_name',\s*new\.email\s*\)/)
})

test('initializer retains UUID, avatar, security context and established-profile protection', () => {
  assert.match(withoutComments, /values \(\s*new\.id,/)
  assert.match(withoutComments, /new\.raw_user_meta_data->>'avatar_url'/)
  assert.match(withoutComments, /on conflict \(id\) do nothing;/)
  assert.match(withoutComments, /SECURITY DEFINER\s+SET search_path TO 'pg_catalog', 'public', 'pg_temp'/)
})

test('migration contains one function replacement with no backfill or trigger/schema changes', () => {
  assert.equal((withoutComments.match(/CREATE OR REPLACE FUNCTION/g) ?? []).length, 1)
  assert.doesNotMatch(withoutComments, /\b(?:UPDATE|DELETE|ALTER|DROP|GRANT|REVOKE|TRUNCATE)\b/i)
  assert.doesNotMatch(withoutComments, /\bCREATE\s+(?:TABLE|TRIGGER|POLICY|SCHEMA)\b/i)
  assert.doesNotMatch(withoutComments, /role|credit|subscription|favorite|referral/i)
})
