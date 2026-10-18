-- ============================================================
-- Fix: notify_on_message trigger function was throwing
--   ERROR 22P02: invalid input value for enum message_type: "audio"
--
-- The trigger compared NEW.type (enum message_type) against
-- string literals like 'audio', 'image', 'video' that are NOT
-- valid enum values. Postgres evaluates the CASE WHEN clauses
-- eagerly, so every message INSERT threw before reaching the
-- notifications INSERT — which silently blocked ALL chat push.
--
-- Fix: cast NEW.type to TEXT once (v_type_text := NEW.type::text)
-- and compare against the TEXT form. No enum validation error.
--
-- Also added action_url column for consistency with other
-- notification-producing triggers (match, connection, comment).
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_preview TEXT;
  v_body TEXT;
  v_type_text TEXT;
BEGIN
  -- Skip deleted messages
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Convert enum to text ONCE (avoids "invalid input value for enum" errors)
  v_type_text := NEW.type::text;

  -- Find the recipient
  SELECT p.id INTO v_recipient_id
  FROM conversations c
  CROSS JOIN LATERAL unnest(c.participant_ids) AS p(id)
  WHERE c.id = NEW.conversation_id
    AND p.id != NEW.sender_id
  LIMIT 1;

  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sender's display name
  SELECT display_name INTO v_sender_name
  FROM profiles WHERE user_id = NEW.sender_id;

  -- Body preview (using v_type_text, not NEW.type)
  v_preview := COALESCE(LEFT(NEW.content, 100), '');
  v_body := CASE
    WHEN v_type_text = 'voice' THEN 'Sent a voice message'
    WHEN v_type_text = 'image' OR (NEW.metadata->>'actualType') = 'image' THEN 'Sent a photo'
    WHEN v_type_text = 'gift' THEN 'Sent you a ' || COALESCE(NEW.metadata->>'giftName', 'gift')
    ELSE v_preview
  END;

  INSERT INTO notifications (user_id, type, title, body, status, data, channels, action_url)
  VALUES (
    v_recipient_id,
    'message'::notification_type,
    COALESCE(v_sender_name, 'Someone'),
    v_body,
    'unread',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'url', '/chats/' || NEW.conversation_id,
      'tag', 'chat-' || NEW.conversation_id,
      'message_id', NEW.id,
      'source', 'message'
    ),
    ARRAY['in_app','push'],
    '/chats/' || NEW.conversation_id
  );

  RETURN NEW;
END;
$function$;