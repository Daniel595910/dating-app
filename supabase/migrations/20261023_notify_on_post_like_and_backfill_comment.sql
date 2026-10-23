-- Two fixes in one migration:
--
-- 1. NEW: notify_on_post_like trigger + trg_post_like_notification
--    Likes never notified the post author. No trigger existed, and
--    the client-side notificationService.notifyLike() was dead code.
--
-- 2. BACKFILL: notify_on_comment function + trg_comment_notification trigger
--    The function existed in production DB but was never saved to migrations.
--    Rebuilding from migrations would silently lose comment notifications.
--
-- Applied to production on 2026-10-23.

-- ============================================================
-- PART 1 — Like notifications
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_post_author_id UUID;
  v_liker_name TEXT;
BEGIN
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts WHERE id = NEW.post_id;

  -- Skip self-likes and posts that no longer exist
  IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get liker display name
  SELECT display_name INTO v_liker_name
  FROM profiles WHERE user_id = NEW.user_id;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, body, status, data, channels, action_url)
  VALUES (
    v_post_author_id,
    'like',
    'New Like',
    COALESCE(v_liker_name, 'Someone') || ' liked your post',
    'unread',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'liker_id', NEW.user_id,
      'source', 'post_like'
    ),
    ARRAY['in_app'],
    '/community?postId=' || NEW.post_id
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_post_like_notification ON public.post_reactions;

CREATE TRIGGER trg_post_like_notification
AFTER INSERT ON public.post_reactions
FOR EACH ROW
WHEN (NEW.reaction_type = 'like')
EXECUTE FUNCTION public.notify_on_post_like();

-- ============================================================
-- PART 2 — Backfill: notify_on_comment into migrations
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_author_id UUID;
  v_post_author_id UUID;
  v_commenter_name TEXT;
BEGIN
  SELECT display_name INTO v_commenter_name
  FROM profiles WHERE user_id = NEW.author_id;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author_id
    FROM comments WHERE id = NEW.parent_id;

    IF v_parent_author_id IS NOT NULL AND v_parent_author_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, type, title, body, status, data, channels, action_url)
      VALUES (
        v_parent_author_id,
        'comment',
        'New Reply',
        COALESCE(v_commenter_name, 'Someone') || ' replied to your comment',
        'unread',
        jsonb_build_object(
          'comment_id', NEW.id,
          'post_id', NEW.post_id,
          'parent_id', NEW.parent_id,
          'source', 'comment_reply'
        ),
        ARRAY['in_app'],
        '/community?postId=' || NEW.post_id || '&commentId=' || NEW.parent_id
      );
    END IF;
  ELSE
    SELECT author_id INTO v_post_author_id
    FROM posts WHERE id = NEW.post_id;

    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, type, title, body, status, data, channels, action_url)
      VALUES (
        v_post_author_id,
        'comment',
        'New Comment',
        COALESCE(v_commenter_name, 'Someone') || ' commented on your post',
        'unread',
        jsonb_build_object(
          'comment_id', NEW.id,
          'post_id', NEW.post_id,
          'source', 'post_comment'
        ),
        ARRAY['in_app'],
        '/community?postId=' || NEW.post_id || '&commentId=' || NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_comment_notification ON public.comments;

CREATE TRIGGER trg_comment_notification
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_comment();

-- Verification
-- SELECT proname FROM pg_proc WHERE proname IN ('notify_on_post_like','notify_on_comment')
--   AND pronamespace = 'public'::regnamespace;
-- SELECT trigger_name, event_object_table FROM information_schema.triggers
--   WHERE trigger_name IN ('trg_post_like_notification','trg_comment_notification');
