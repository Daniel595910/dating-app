-- ============================================================
-- Sync identity verification into both face_verified and is_verified
--
-- Context:
--   The web app renders the verified badge based on profiles.is_verified
--   (13 call sites across 10 files). The identity_verifications trigger
--   originally only set profiles.face_verified, so approvals produced
--   face_verified=true / is_verified=false — badge never rendered.
--
--   This migration updates the trigger to keep both flags in sync, and
--   backfills existing approved submissions.
--
-- Note: does NOT touch verification_badge (that enum is VIP tier:
--       none | basic | premium | vip).
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_face_verified_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved'
     AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE profiles
    SET face_verified    = true,
        face_verified_at = now(),
        is_verified      = true
    WHERE user_id = NEW.user_id;

  ELSIF NEW.status = 'rejected'
        AND OLD.status = 'approved' THEN
    UPDATE profiles
    SET face_verified    = false,
        face_verified_at = null,
        is_verified      = false
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: any user whose latest identity_verifications row is 'approved'
-- should have is_verified = true.
UPDATE profiles p
SET is_verified = true
FROM identity_verifications iv
WHERE iv.user_id = p.user_id
  AND iv.status  = 'approved'
  AND p.is_verified = false;