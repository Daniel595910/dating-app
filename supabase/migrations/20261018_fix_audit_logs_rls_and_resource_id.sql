-- ============================================================
-- Fix audit log: two bugs prevented /audit-log from showing rows.
--
-- Bug 1 (WRITE): audit_logs.resource_id was NOT NULL, but the RPC
--   log_audit_entry accepts p_resource_id DEFAULT NULL and the client
--   audit.service.ts passes params.resourceId || null for actions
--   without a resource (login, logout, settings, etc). Those writes
--   silently failed on the NOT NULL constraint — so no new rows
--   were created since the table was added.
--
-- Bug 2 (READ): RLS was enabled on audit_logs with NO SELECT policy.
--   Existing rows (some 6 days old) were invisible to any client
--   query. The admin page always showed "No audit log entries"
--   even though the table had data.
--
-- This migration:
--   1. Drops the NOT NULL constraint on resource_id (matches RPC).
--   2. Adds a SELECT policy for admin users.
--   3. Blocks direct client INSERT/UPDATE/DELETE — writes only go
--      through the log_audit_entry SECURITY DEFINER function, which
--      bypasses RLS. This keeps the audit trail tamper-proof.
-- ============================================================

ALTER TABLE public.audit_logs
  ALTER COLUMN resource_id DROP NOT NULL;

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