-- ============================================================
-- Location verification
--
-- Adds GPS + signal-cross-check fields to profiles.
-- The user-facing 'location' JSONB stays editable (display),
-- while gps_* fields are captured from the browser geolocation API
-- and never overwritten by the client after signup.
-- ============================================================

-- GPS coordinates captured at signup (immutable after first capture)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gps_lat numeric(9, 6);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gps_lng numeric(9, 6);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gps_captured_at timestamptz;

-- Reverse-geocoded from GPS coordinates (server-side)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gps_city text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gps_state text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gps_country text;

-- Signal cross-check at signup
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ip_country text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone_country text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_signals_match boolean;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_flag_reason text;

-- Last time the display location was changed by the user
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- Index for admin queries (find flagged accounts)
CREATE INDEX IF NOT EXISTS idx_profiles_location_flagged
  ON public.profiles(location_signals_match)
  WHERE location_signals_match = false;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'gps_lat', 'gps_lng', 'gps_captured_at',
    'gps_city', 'gps_state', 'gps_country',
    'ip_country', 'timezone_country',
    'location_signals_match', 'location_flag_reason',
    'location_updated_at'
  )
ORDER BY column_name;