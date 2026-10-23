-- Fix RLS policies that blocked super_admin from reading/updating key tables.
--
-- Root cause: several policies hardcoded ARRAY['admin', 'moderator'] without
-- including 'super_admin'. The is_admin_user() helper function already includes
-- super_admin, but these specific policies don't call it - they inline the array.
--
-- Symptom: admin panel showed empty tables for super_admin users with no error.
--
-- Fix: add 'super_admin' to all 5 hardcoded-array policies.
--
-- Applied to production on 2026-10-22.

-- 1. identity_verifications - SELECT
DROP POLICY IF EXISTS "Admins read all verifications" ON identity_verifications;
CREATE POLICY "Admins read all verifications" ON identity_verifications
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'moderator', 'super_admin']::text[])
  ));

-- 2. identity_verifications - UPDATE
DROP POLICY IF EXISTS "Admins update verifications" ON identity_verifications;
CREATE POLICY "Admins update verifications" ON identity_verifications
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'moderator', 'super_admin']::text[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'moderator', 'super_admin']::text[])
  ));

-- 3. comment_reports - SELECT
DROP POLICY IF EXISTS "Admins read all reports" ON comment_reports;
CREATE POLICY "Admins read all reports" ON comment_reports
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'moderator', 'super_admin']::text[])
  ));

-- 4. safety_audit_log - SELECT
DROP POLICY IF EXISTS "Admins read safety audit log" ON safety_audit_log;
CREATE POLICY "Admins read safety audit log" ON safety_audit_log
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'moderator', 'super_admin']::text[])
  ));

-- 5. safety_events - SELECT
DROP POLICY IF EXISTS "Admins read safety events" ON safety_events;
CREATE POLICY "Admins read safety events" ON safety_events
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'moderator', 'super_admin']::text[])
  ));