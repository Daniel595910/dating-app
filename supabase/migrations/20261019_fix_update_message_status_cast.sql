-- ============================================================
-- Fix update_message_status RPC 400 error
--
-- The RPC was doing `SET status = p_status` where p_status is TEXT
-- and messages.status is the message_status enum. Postgres normally
-- auto-casts text → enum, but under the function's execution context
-- this failed for every call, causing 400 (invalid input for enum)
-- on every read receipt.
--
-- Fix:
--   1. Explicit ::message_status cast
--   2. Add search_path = 'public' so the enum resolves consistently
--      for SECURITY DEFINER functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_message_status(p_message_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE messages
    SET status = p_status::message_status,
        updated_at = NOW()
    WHERE id = p_message_id
    AND conversation_id IN (
        SELECT id FROM conversations WHERE v_user_id = ANY(participant_ids)
    );
END;
$function$;