-- Migration: Admin User Management
-- Adds role column to profiles, admin_audit_log table,
-- and a trigger that prevents non-admins from changing roles via direct DB access.

-- ── 1. role column on profiles ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'coach'));

-- Backfill: any existing rows that somehow have a NULL role (shouldn't exist
-- after the DEFAULT, but belt-and-suspenders)
UPDATE public.profiles SET role = 'user' WHERE role IS NULL;

-- ── 2. admin_audit_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  performed_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text        NOT NULL,          -- 'promote' | 'demote'
  old_role     text,
  new_role     text
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read the audit log; nobody can write directly (only service role via API)
CREATE POLICY "admins_can_read_audit_log" ON public.admin_audit_log
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── 3. Trigger: protect profiles.role from non-admin direct writes ──────────
-- Service role (used by our API) has no JWT (auth.jwt() returns null) so it
-- is allowed through. Regular authenticated users who are not admins are blocked.
CREATE OR REPLACE FUNCTION public.enforce_role_column_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND auth.jwt() IS NOT NULL THEN
    IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Unauthorized: only administrators can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_column_update ON public.profiles;
CREATE TRIGGER enforce_role_column_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_role_column_update();
