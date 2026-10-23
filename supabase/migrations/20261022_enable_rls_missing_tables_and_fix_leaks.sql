-- Enable RLS on 4 tables that were missing it, and remove 2 leaky USING(true) SELECT policies.
--
-- Discovered during post-launch security audit on 2026-10-22.
--
-- Missing RLS (public read/write by anyone with anon key):
--   - announcements
--   - login_verifications   (8 real rows - OTP hashes were publicly readable)
--   - notification_global_settings
--   - notification_type_settings
--
-- Leaky USING(true) SELECT policies (bypassed RLS entirely):
--   - pinned_messages.view_pinned_messages  (leaked all chat pins to anon)
--   - profile_photos.view_profile_photos    (leaked all photos to anon)
--
-- Applied to production on 2026-10-22.

BEGIN;

-- 1. announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_read_sent" ON public.announcements
  FOR SELECT TO public
  USING (status = 'sent' OR is_admin_user(auth.uid()));
CREATE POLICY "announcements_admin_write" ON public.announcements
  FOR ALL TO public
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- 2. login_verifications
ALTER TABLE public.login_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_verifications_user_read_own" ON public.login_verifications
  FOR SELECT TO public USING (user_id = auth.uid());
CREATE POLICY "login_verifications_admin_all" ON public.login_verifications
  FOR ALL TO public
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- 3. notification_global_settings
ALTER TABLE public.notification_global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_global_settings_public_read" ON public.notification_global_settings
  FOR SELECT TO public USING (true);
CREATE POLICY "notification_global_settings_admin_write" ON public.notification_global_settings
  FOR ALL TO public
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- 4. notification_type_settings
ALTER TABLE public.notification_type_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_type_settings_public_read" ON public.notification_type_settings
  FOR SELECT TO public USING (true);
CREATE POLICY "notification_type_settings_admin_write" ON public.notification_type_settings
  FOR ALL TO public
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- 5. Drop leaky pinned_messages policy (view_pinned remains as the gate)
DROP POLICY IF EXISTS "view_pinned_messages" ON public.pinned_messages;

-- 6. Replace leaky profile_photos policy with login-required + discoverable rule
DROP POLICY IF EXISTS "view_profile_photos" ON public.profile_photos;
CREATE POLICY "profile_photos_view" ON public.profile_photos
  FOR SELECT TO public
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_photos.profile_id AND p.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_photos.profile_id AND COALESCE(p.is_discoverable, true) = true)
      OR is_admin_user(auth.uid())
    )
  );

COMMIT;