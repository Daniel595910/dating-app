-- Fix update_presence: always update last_seen_at
--
-- Previously, last_seen_at only updated when going online.
-- If a user crashed/force-closed, is_online stayed true with a stale
-- last_seen_at. Client had no way to detect stale presence.
--
-- After: last_seen_at ALWAYS reflects the user's last heartbeat,
-- whether online or offline. Client checks now - last_seen_at < 60s
-- to determine if is_online = true is still accurate.

CREATE OR REPLACE FUNCTION public.update_presence(p_is_online boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO presence (user_id, is_online, last_seen_at)
    VALUES (v_user_id, p_is_online, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET 
        is_online = p_is_online,
        last_seen_at = NOW();
END;
$function$;