-- Fix mark_conversation_read: also clear unread_counts for the reader.
-- Previously only updated messages.status, leaving unread_counts intact,
-- so chat list kept showing unread badges after opening a conversation.

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
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

    UPDATE messages
    SET status = 'read',
        updated_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != v_user_id
    AND status != 'read';

    UPDATE conversations
    SET unread_counts = jsonb_set(
        COALESCE(unread_counts, '{}'::jsonb),
        ARRAY[v_user_id::text],
        '0'::jsonb,
        true
    )
    WHERE id = p_conversation_id
    AND v_user_id = ANY(participant_ids);
END;
$function$;