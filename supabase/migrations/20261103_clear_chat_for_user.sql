-- Clear chat for a single user: hide all messages in a conversation from
-- this user's view without deleting them for the other participant.
--
-- Uses messages.deleted_for_users UUID[] — appends auth.uid() to each
-- message row's deleted_for_users array. getMessages filters these out.

CREATE OR REPLACE FUNCTION public.clear_chat_for_user(p_conversation_id uuid)
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
        WHERE id = p_conversation_id
        AND v_user_id = ANY(participant_ids)
    ) THEN
        RAISE EXCEPTION 'Not a conversation participant';
    END IF;

    -- Mark all messages as cleared for this user (idempotent)
    UPDATE messages
    SET deleted_for_users = array_append(
        COALESCE(deleted_for_users, ARRAY[]::uuid[]),
        v_user_id
    )
    WHERE conversation_id = p_conversation_id
      AND NOT (v_user_id = ANY(COALESCE(deleted_for_users, ARRAY[]::uuid[])));

    -- Reset this user's unread count
    UPDATE conversations
    SET unread_counts = jsonb_set(
        COALESCE(unread_counts, '{}'::jsonb),
        ARRAY[v_user_id::text],
        '0'::jsonb,
        true
    )
    WHERE id = p_conversation_id;
END;
$function$;

-- Index for filtering cleared messages efficiently
CREATE INDEX IF NOT EXISTS idx_messages_deleted_for_users
    ON messages USING GIN (deleted_for_users);