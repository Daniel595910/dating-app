-- Chat theme support + disappearing messages expiry.
--
-- 1. Extend set_chat_wallpaper RPC to accept a theme param.
-- 2. Add expires_at column to messages.
-- 3. Trigger sets expires_at based on conversation disappearing settings.
-- 4. Hourly cron job deletes expired messages.
--
-- Applied: 2026-10-24.

-- ============================================================
-- PART 1 — Chat theme (light/dark)
-- ============================================================

DROP FUNCTION IF EXISTS public.set_chat_wallpaper(uuid, text, text);

CREATE OR REPLACE FUNCTION public.set_chat_wallpaper(
    p_conversation_id uuid,
    p_wallpaper_url text DEFAULT NULL::text,
    p_wallpaper_color text DEFAULT '#f0f2f5'::text,
    p_theme text DEFAULT 'light'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF NOT is_conversation_participant(p_conversation_id, v_user_id) THEN
        RAISE EXCEPTION 'Not a conversation participant';
    END IF;

    IF p_theme NOT IN ('light', 'dark') THEN
        RAISE EXCEPTION 'Invalid theme: must be light or dark';
    END IF;

    INSERT INTO chat_preferences (conversation_id, user_id, wallpaper_url, wallpaper_color, theme)
    VALUES (p_conversation_id, v_user_id, p_wallpaper_url, p_wallpaper_color, p_theme)
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET
        wallpaper_url = p_wallpaper_url,
        wallpaper_color = p_wallpaper_color,
        theme = p_theme,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'theme', p_theme);
END;
$function$;

-- ============================================================
-- PART 2 — Disappearing messages
-- ============================================================

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_messages_expires_at
    ON public.messages (expires_at)
    WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_message_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_enabled boolean;
    v_hours integer;
BEGIN
    SELECT disappearing_enabled, disappearing_duration_hours
    INTO v_enabled, v_hours
    FROM conversations WHERE id = NEW.conversation_id;

    IF v_enabled = true THEN
        NEW.expires_at := NOW() + ((COALESCE(v_hours, 24)) || ' hours')::interval;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_message_expiry ON public.messages;
CREATE TRIGGER trg_set_message_expiry
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_message_expiry();

-- ============================================================
-- PART 3 — Cron job to delete expired messages
-- ============================================================

-- Runs hourly, deletes messages past their expiry
SELECT cron.schedule(
    'cleanup-expired-messages',
    '0 * * * *',
    $$ DELETE FROM public.messages WHERE expires_at IS NOT NULL AND expires_at < NOW(); $$
);
