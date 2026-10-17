-- ============================================================
-- login_verifications - tracks login OTP codes and trusted devices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.login_verifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash         text,
  device_token_hash text,
  user_agent        text,
  ip_address        text,
  expires_at        timestamptz NOT NULL,
  verified_at       timestamptz,
  attempts          int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Reconcile with older schema if it exists
ALTER TABLE public.login_verifications ALTER COLUMN code_hash DROP NOT NULL;
ALTER TABLE public.login_verifications DROP COLUMN IF EXISTS device_id;
ALTER TABLE public.login_verifications ADD COLUMN IF NOT EXISTS device_token_hash text;

CREATE INDEX IF NOT EXISTS idx_login_verif_user_pending
  ON public.login_verifications(user_id, created_at DESC)
  WHERE verified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_login_verif_device
  ON public.login_verifications(device_token_hash)
  WHERE device_token_hash IS NOT NULL;

ALTER TABLE public.login_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read login_verifications" ON public.login_verifications;
CREATE POLICY "admins read login_verifications"
  ON public.login_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );