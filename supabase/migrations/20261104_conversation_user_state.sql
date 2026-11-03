-- Per-user conversation state: pin, archive, soft-delete.
-- One row per (user_id, conversation_id). Absent row = default state.
--
-- Pin limit: 3 per user (enforced in pin_conversation RPC).
-- Delete is soft (hidden from list). New message from the other
-- participant auto-unhides via trigger.

CREATE TABLE IF NOT EXISTS public.conversation_user_state (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_cus_user_pinned
    ON public.conversation_user_state (user_id, is_pinned)
    WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_cus_user_archived
    ON public.conversation_user_state (user_id, is_archived)
    WHERE is_archived = true;

CREATE INDEX IF NOT EXISTS idx_cus_user_deleted
    ON public.conversation_user_state (user_id, is_deleted)
    WHERE is_deleted = true;

ALTER TABLE public.conversation_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own conversation state" ON public.conversation_user_state;
CREATE POLICY "Users manage own conversation state"
    ON public.conversation_user_state
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.pin_conversation(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_pin_count INT;
    v_already_pinned BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM conversations
        WHERE id = p_conversation_id AND v_user_id = ANY(participant_ids)
    ) THEN
        RAISE EXCEPTION 'Not a conversation participant';
    END IF;

    SELECT is_pinned INTO v_already_pinned
    FROM conversation_user_state
    WHERE user_id = v_user_id AND conversation_id = p_conversation_id;

    IF COALESCE(v_already_pinned, false) THEN
        RETURN;
    END IF;

    SELECT count(*) INTO v_pin_count
    FROM conversation_user_state
    WHERE user_id = v_user_id AND is_pinned = true AND is_deleted = false;

    IF v_pin_count >= 3 THEN
        RAISE EXCEPTION 'Maximum 3 pinned chats allowed'
            USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO conversation_user_state (user_id, conversation_id, is_pinned, pinned_at)
    VALUES (v_user_id, p_conversation_id, true, NOW())
    ON CONFLICT (user_id, conversation_id) DO UPDATE
    SET is_pinned = true,
        pinned_at = CASE WHEN NOT conversation_user_state.is_pinned THEN NOW() ELSE conversation_user_state.pinned_at END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unpin_conversation(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE conversation_user_state
    SET is_pinned = false, pinned_at = NULL
    WHERE user_id = v_user_id AND conversation_id = p_conversation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_conversation(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM conversations
        WHERE id = p_conversation_id AND v_user_id = ANY(participant_ids)
    ) THEN
        RAISE EXCEPTION 'Not a conversation participant';
    END IF;

    INSERT INTO conversation_user_state (user_id, conversation_id, is_archived, archived_at)
    VALUES (v_user_id, p_conversation_id, true, NOW())
    ON CONFLICT (user_id, conversation_id) DO UPDATE
    SET is_archived = true, archived_at = NOW(), is_pinned = false, pinned_at = NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unarchive_conversation(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE conversation_user_state
    SET is_archived = false, archived_at = NULL
    WHERE user_id = v_user_id AND conversation_id = p_conversation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_conversation_for_user(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM conversations
        WHERE id = p_conversation_id AND v_user_id = ANY(participant_ids)
    ) THEN
        RAISE EXCEPTION 'Not a conversation participant';
    END IF;

    INSERT INTO conversation_user_state (user_id, conversation_id, is_deleted, deleted_at)
    VALUES (v_user_id, p_conversation_id, true, NOW())
    ON CONFLICT (user_id, conversation_id) DO UPDATE
    SET is_deleted = true, deleted_at = NOW(),
        is_archived = false, archived_at = NULL,
        is_pinned = false, pinned_at = NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unhide_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE conversation_user_state
    SET is_deleted = false, deleted_at = NULL
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
      AND is_deleted = true;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_unhide_conversation_on_message ON public.messages;
CREATE TRIGGER trg_unhide_conversation_on_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.unhide_conversation_on_message();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_user_state'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_user_state';
    END IF;
END $$;