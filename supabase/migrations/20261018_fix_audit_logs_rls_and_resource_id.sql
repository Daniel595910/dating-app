-- ============================================================
-- Fix audit log: two bugs prevented the admin /audit-log page
-- from showing any entries.
--
-- Bug 1 (WRITE): audit_logs.resource_id was NOT NULL, but the RPC
--   log_audit_entry accepts p_resource_id DEFAULT NULL and the client
--   (audit.service.ts) passes params.resourceId || null for actions
--   that have no resource (login, logout, bulk operations). Those
--   writes silently failed on the NOT NULL constraint.
--
-- Bug 2 (READ): RLS was enabled on audit_logs with NO SELECT policy,
--   so even though old rows existed in the table, the client-side
--   getLogs() query returned 0 rows. The admin page always showed
--   "No audit log entries".
--
-- This migration:
--   1. Drops the NOT NULL constraint on resource_id (matches the RPC)
--   2. Adds a SELECT policy for admin users
--   3. Blocks direct client INSERT/UPDATE/DELETE — writes only go
--      through the log_audit_entry SECURITY DEFINER function, which
--      bypasses RLS. This makes the audit trail tamper-proof.
-- ============================================================

-- 1. Allow NULL resource_id
ALTER TABLE public.audit_logs
  ALTER COLUMN resource_id DROP NOT NULL;

-- 2. RLS SELECT policy — admins only
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND (
          profiles.is_admin = true
          OR profiles.role IN ('super_admin', 'admin', 'moderator', 'support_agent', 'analyst')
        )
    )
  );

-- 3. Block direct writes (audit trail integrity)
DROP POLICY IF EXISTS "No direct inserts to audit logs" ON public.audit_logs;
CREATE POLICY "No direct inserts to audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No updates to audit logs" ON public.audit_logs;
CREATE POLICY "No updates to audit logs"
  ON public.audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "No deletes from audit logs" ON public.audit_logs;
CREATE POLICY "No deletes from audit logs"
  ON public.audit_logs
  FOR DELETE
  TO authenticated
  USING (false);