-- ============================================================
-- verification_settings - key/value table for admin-configurable
-- settings that affect the user-facing verification wizard.
--
-- Currently used for:
--   selfie_example_url  ->  URL of the example selfie image
-- ============================================================

CREATE TABLE IF NOT EXISTS public.verification_settings (
  key         text PRIMARY KEY,
  value       text,
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.verification_settings (key, value)
VALUES ('selfie_example_url', NULL)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.verification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone reads verification_settings" ON public.verification_settings;
CREATE POLICY "anyone reads verification_settings"
  ON public.verification_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "admins write verification_settings" ON public.verification_settings;
CREATE POLICY "admins write verification_settings"
  ON public.verification_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

SELECT key, value, updated_at FROM public.verification_settings;