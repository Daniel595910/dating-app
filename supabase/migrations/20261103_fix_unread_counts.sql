-- Fix send_chat_message: increment recipient's unread_counts when a message is sent.
-- Uses array indexing (not unnest) for deterministic recipient detection.

CREATE OR REPLACE FUNCTION public.send_chat_message(
    p_conversation_id uuid,
    p_client_message_id uuid,
    p_content text,
    p_type text DEFAULT 'text'::text,
    p_metadata jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_sender_id UUID := auth.uid();
    v_message_id UUID;
    v_existing_message RECORD;
    v_message_type message_type;
    v_recipient_id UUID;
    v_participants UUID[];
BEGIN
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    BEGIN
        v_message_type := p_type::message_type;
    EXCEPTION WHEN OTHERS THEN
        v_message_type := 'text'::message_type;
    END;

    SELECT * INTO v_existing_message
    FROM messages
    WHERE conversation_id = p_conversation_id
    AND sender_id = v_sender_id
    AND client_message_id = p_client_message_id;

    IF FOUND THEN
        RETURN jsonb_build_object('id', v_existing_message.id, 'duplicate', true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM conversations
        WHERE id = p_conversation_id
        AND v_sender_id = ANY(participant_ids)
    ) THEN
        RAISE EXCEPTION 'Not a conversation participant';
    END IF;

    SELECT participant_ids INTO v_participants
    FROM conversations
    WHERE id = p_conversation_id;

    IF v_participants IS NULL OR array_length(v_participants, 1) < 2 THEN
        RAISE EXCEPTION 'Conversation has fewer than 2 participants';
    END IF;

    IF v_participants[1] = v_sender_id THEN
        v_recipient_id := v_participants[2];
    ELSE
        v_recipient_id := v_participants[1];
    END IF;

    INSERT INTO messages (
        conversation_id,
        sender_id,
        type,
        content,
        status,
        client_message_id,
        metadata
    )
    VALUES (
        p_conversation_id,
        v_sender_id,
        v_message_type,
        p_content,
        'sent',
        p_client_message_id,
        p_metadata
    )
    RETURNING id INTO v_message_id;

    UPDATE conversations
    SET last_message_at = NOW(),
        last_message_preview = LEFT(p_content, 100),
        updated_at = NOW(),
        unread_counts = jsonb_set(
            COALESCE(unread_counts, '{}'::jsonb),
            ARRAY[v_recipient_id::text],
            to_jsonb(COALESCE((unread_counts->>v_recipient_id::text)::int, 0) + 1),
            true
        )
    WHERE id = p_conversation_id;

    RETURN jsonb_build_object('id', v_message_id, 'duplicate', false);
END;
$function$;