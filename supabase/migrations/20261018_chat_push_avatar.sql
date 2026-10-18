-- ============================================================
-- Chat push notifications: include sender's avatar_url in the
-- notification's data payload so the edge function can promote
-- it into the FCM push payload's `icon` and `image` fields.
--
-- Frontend uses:
--   icon: data.icon  (small avatar, top-left of the banner)
--   image: data.image (large avatar, right side — iMessage style)
--
-- Both are read from the notification's `data.avatar_url` by
-- the edge function (notification-sender/index.ts).
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
  v_sender_avatar_url TEXT;
  v_preview TEXT;
  v_body TEXT;
  v_type_text TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_type_text := NEW.type::text;

  SELECT p.id INTO v_recipient_id
  FROM conversations c
  CROSS JOIN LATERAL unnest(c.participant_ids) AS p(id)
  WHERE c.id = NEW.conversation_id
    AND p.id != NEW.sender_id
  LIMIT 1;

  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name, avatar_url
    INTO v_sender_name, v_sender_avatar_url
  FROM profiles WHERE user_id = NEW.sender_id;

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
      'avatar_url', v_sender_avatar_url,  -- NEW: passed to edge fn → icon/image
      'source', 'message'
    ),
    ARRAY['in_app','push'],
    '/chats/' || NEW.conversation_id
  );

  RETURN NEW;
END;
$function$;