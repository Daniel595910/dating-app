-- ============================================================
-- Platform settings: allow anonymous reads for pre-login boot
--
-- Why: apps/web/main.tsx loads platform_settings on app boot to
-- set document.title (app name), favicon, and maintenance mode.
-- This runs BEFORE login, so the request uses the `anon` role.
--
-- The original policy was TO authenticated, which blocked the
-- anonymous fetch — settings load returned empty, tab title stayed
-- at the hardcoded fallback, favicon never updated.
--
-- Also includes admin-manage policy for writes.
-- ============================================================

-- Drop and recreate the SELECT policy to include anon
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;

CREATE POLICY "Anyone can read settings"
  ON public.platform_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can manage settings (writes)
DROP POLICY IF EXISTS "Admins can manage settings" ON public.platform_settings;

CREATE POLICY "Admins can manage settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));