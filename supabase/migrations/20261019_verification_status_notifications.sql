-- ============================================================
-- Verification status change notification
--
-- Fires when an admin approves or rejects an identity verification.
-- Complementary to trg_sync_face_verified (which syncs flags).
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_verification_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    v_title := 'You''re verified ✅';
    v_body := 'Your identity has been verified. Your profile now shows a verified badge.';
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'Verification needs attention';
    v_body := COALESCE(
      'Your verification was not approved: ' || NEW.rejection_reason,
      'Your verification was not approved. Please re-submit with clearer photos.'
    );
  END IF;

  INSERT INTO notifications (user_id, type, title, body, status, data, channels, action_url)
  VALUES (
    NEW.user_id,
    'verification'::notification_type,
    v_title,
    v_body,
    'unread',
    jsonb_build_object(
      'verification_id', NEW.id,
      'status', NEW.status,
      'source', 'identity_verification'
    ),
    ARRAY['in_app','push'],
    '/profile/verify'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_on_verification_status_change ON public.identity_verifications;

CREATE TRIGGER trg_notify_on_verification_status_change
  AFTER UPDATE OF status ON public.identity_verifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_verification_status_change();