-- ============================================================
-- DATING APP — ALL RPC FUNCTIONS
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ADMIN FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE user_id = p_user_id 
    AND (is_admin = true OR role IN ('admin', 'super_admin', 'moderator'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION grant_admin_role(p_user_id UUID, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE user_id = auth.uid();
  IF v_caller_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admins can grant roles');
  END IF;
  UPDATE profiles SET role = p_role, is_admin = true, updated_at = NOW() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true, 'role', p_role);
END;
$$;

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE OR REPLACE FUNCTION log_audit_entry(
  p_user_id UUID, p_action VARCHAR, p_resource_type VARCHAR,
  p_resource_id UUID DEFAULT NULL, p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL, p_user_agent TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes, ip_address, user_agent)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_changes, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- ============================================================
-- CHAT FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = p_conversation_id AND p_user_id = ANY(participant_ids)
  );
END;
$$;

CREATE OR REPLACE FUNCTION send_chat_message(
  p_conversation_id UUID, p_client_message_id UUID, p_content TEXT,
  p_type TEXT DEFAULT 'text', p_metadata JSONB DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sender_id UUID := auth.uid(); v_message_id UUID; v_message_type message_type;
BEGIN
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  BEGIN v_message_type := p_type::message_type;
  EXCEPTION WHEN OTHERS THEN v_message_type := 'text'::message_type; END;
  INSERT INTO messages (conversation_id, sender_id, type, content, status, client_message_id, metadata)
  VALUES (p_conversation_id, v_sender_id, v_message_type, p_content, 'sent', p_client_message_id, p_metadata)
  RETURNING id INTO v_message_id;
  UPDATE conversations SET last_message_at = NOW(), last_message_preview = LEFT(p_content, 100), updated_at = NOW()
  WHERE id = p_conversation_id;
  RETURN jsonb_build_object('id', v_message_id, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION edit_chat_message(p_message_id UUID, p_content TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sender_id UUID := auth.uid();
BEGIN
  UPDATE messages SET content = p_content, edited_at = NOW(), updated_at = NOW()
  WHERE id = p_message_id AND sender_id = v_sender_id AND deleted_for_everyone = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found or not editable'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION delete_message_for_everyone(p_message_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sender_id UUID := auth.uid();
BEGIN
  UPDATE messages SET deleted_for_everyone = true, content = '', deleted_at = NOW(), deleted_by = v_sender_id
  WHERE id = p_message_id AND sender_id = v_sender_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION delete_message_for_me(p_message_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  UPDATE messages SET deleted_for_users = array_append(deleted_for_users, v_user_id)
  WHERE id = p_message_id AND NOT (v_user_id = ANY(deleted_for_users));
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION add_message_reaction(p_message_id UUID, p_reaction TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO message_reactions (message_id, user_id, reaction)
  VALUES (p_message_id, v_user_id, p_reaction)
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION remove_message_reaction(p_message_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM message_reactions WHERE message_id = p_message_id AND user_id = auth.uid();
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION pin_chat_message(p_message_id UUID, p_conversation_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO pinned_messages (message_id, conversation_id, pinned_by) 
  VALUES (p_message_id, p_conversation_id, v_user_id) ON CONFLICT DO NOTHING;
  UPDATE messages SET is_pinned = true WHERE id = p_message_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION unpin_chat_message(p_message_id UUID, p_conversation_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM pinned_messages WHERE message_id = p_message_id AND conversation_id = p_conversation_id;
  UPDATE messages SET is_pinned = false WHERE id = p_message_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION set_chat_wallpaper(p_conversation_id UUID, p_wallpaper_url TEXT DEFAULT NULL, p_wallpaper_color TEXT DEFAULT '#f0f2f5')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO chat_preferences (conversation_id, user_id, wallpaper_url, wallpaper_color, updated_at)
  VALUES (p_conversation_id, v_user_id, p_wallpaper_url, p_wallpaper_color, NOW())
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION set_disappearing_messages(p_conversation_id UUID, p_enabled BOOLEAN, p_duration_hours INTEGER DEFAULT 24)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE conversations SET disappearing_enabled = p_enabled, disappearing_duration_hours = p_duration_hours, updated_at = NOW()
  WHERE id = p_conversation_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  UPDATE conversation_participants SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_message_status(p_message_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE messages SET status = p_status::message_status, updated_at = NOW() WHERE id = p_message_id;
END;
$$;

-- ============================================================
-- PRESENCE
-- ============================================================

CREATE OR REPLACE FUNCTION update_presence(p_is_online BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO presence (user_id, is_online, last_seen_at) VALUES (v_user_id, p_is_online, NOW())
  ON CONFLICT (user_id) DO UPDATE SET is_online = p_is_online, last_seen_at = CASE WHEN p_is_online THEN NOW() ELSE presence.last_seen_at END;
END;
$$;

CREATE OR REPLACE FUNCTION format_last_seen(p_last_seen_at TIMESTAMPTZ)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_seconds INTEGER;
BEGIN
  v_seconds := EXTRACT(EPOCH FROM (NOW() - p_last_seen_at));
  IF v_seconds < 60 THEN RETURN 'Just now';
  ELSIF v_seconds < 3600 THEN RETURN (v_seconds / 60)::INTEGER || 'm ago';
  ELSIF v_seconds < 86400 THEN RETURN (v_seconds / 3600)::INTEGER || 'h ago';
  ELSIF v_seconds < 604800 THEN RETURN (v_seconds / 86400)::INTEGER || 'd ago';
  ELSE RETURN TO_CHAR(p_last_seen_at, 'Mon DD'); END IF;
END;
$$;

-- ============================================================
-- MATCHING
-- ============================================================

CREATE OR REPLACE FUNCTION send_connection_request(p_target_id UUID, p_message TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_requester_id UUID := auth.uid(); v_request_id UUID;
BEGIN
  IF v_requester_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_target_id = v_requester_id THEN RAISE EXCEPTION 'Cannot send to yourself'; END IF;
  INSERT INTO match_requests (requester_id, target_id, message, status)
  VALUES (v_requester_id, p_target_id, p_message, 'pending') RETURNING id INTO v_request_id;
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION accept_connection_request(p_request_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_target_id UUID := auth.uid(); v_requester_id UUID; v_match_id UUID; v_user_a UUID; v_user_b UUID;
BEGIN
  SELECT requester_id INTO v_requester_id FROM match_requests
  WHERE id = p_request_id AND target_id = v_target_id AND status = 'pending' FOR UPDATE;
  IF v_requester_id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  UPDATE match_requests SET status = 'accepted', updated_at = NOW() WHERE id = p_request_id;
  IF v_requester_id < v_target_id THEN v_user_a := v_requester_id; v_user_b := v_target_id;
  ELSE v_user_a := v_target_id; v_user_b := v_requester_id; END IF;
  INSERT INTO matches (user1_id, user2_id, stage, status) VALUES (v_user_a, v_user_b, 'getting_to_know', 'active')
  ON CONFLICT DO NOTHING RETURNING id INTO v_match_id;
  IF v_match_id IS NULL THEN
    SELECT id INTO v_match_id FROM matches WHERE user1_id = v_user_a AND user2_id = v_user_b;
  END IF;
  RETURN v_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION decline_connection_request(p_request_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE match_requests SET status = 'declined', updated_at = NOW()
  WHERE id = p_request_id AND target_id = auth.uid() AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION cancel_connection_request(p_request_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE match_requests SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_request_id AND requester_id = auth.uid() AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION get_or_create_conversation(p_match_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_conversation_id UUID; v_participants UUID[];
BEGIN
  SELECT id INTO v_conversation_id FROM conversations WHERE match_id = p_match_id LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN RETURN v_conversation_id; END IF;
  SELECT ARRAY[user1_id, user2_id] INTO v_participants FROM matches WHERE id = p_match_id;
  INSERT INTO conversations (match_id, participant_ids) VALUES (p_match_id, v_participants)
  RETURNING id INTO v_conversation_id;
  RETURN v_conversation_id;
END;
$$;

-- ============================================================
-- DISCOVER VIDEOS
-- ============================================================

CREATE OR REPLACE FUNCTION submit_discover_video(p_video_url TEXT, p_caption TEXT DEFAULT NULL, p_thumbnail_url TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID := auth.uid(); v_video_id UUID;
BEGIN
  INSERT INTO discover_videos (user_id, video_url, thumbnail_url, caption, status)
  VALUES (v_user_id, p_video_url, p_thumbnail_url, p_caption, 'pending')
  RETURNING id INTO v_video_id;
  RETURN jsonb_build_object('success', true, 'video_id', v_video_id);
END;
$$;

CREATE OR REPLACE FUNCTION track_video_view(p_video_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE discover_videos SET view_count = view_count + 1 WHERE id = p_video_id;
END;
$$;

-- ============================================================
-- SEARCH
-- ============================================================

CREATE OR REPLACE FUNCTION search_people(p_query TEXT, p_current_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(user_id UUID, display_name TEXT, avatar_url TEXT, bio TEXT, occupation TEXT,
  interests TEXT[], languages TEXT[], location JSONB, relationship_intent TEXT,
  is_verified BOOLEAN, birth_date DATE, gender TEXT, relevance_score INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name::TEXT, p.avatar_url, p.bio::TEXT, p.occupation::TEXT,
    p.interests, p.languages, p.location, p.relationship_intent::TEXT,
    p.is_verified, p.birth_date, p.gender::TEXT,
    CASE WHEN p.display_name ILIKE p_query || '%' THEN 100
         WHEN p.display_name ILIKE '%' || p_query || '%' THEN 50
         ELSE 10 END AS relevance_score
  FROM profiles p
  WHERE p.user_id != p_current_user_id
    AND (p.display_name ILIKE '%' || p_query || '%' OR p.occupation ILIKE '%' || p_query || '%')
  ORDER BY relevance_score DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION search_communities(p_query TEXT, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(id UUID, name TEXT, description TEXT, country TEXT, state TEXT, city TEXT, member_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name::TEXT, c.description, c.country::TEXT, c.state::TEXT, c.city::TEXT, c.member_count
  FROM communities c
  WHERE c.status = 'active' AND (c.name ILIKE '%' || p_query || '%' OR c.description ILIKE '%' || p_query || '%')
  ORDER BY c.member_count DESC LIMIT p_limit;
END;
$$;

-- ============================================================
-- CALLS
-- ============================================================

CREATE OR REPLACE FUNCTION start_voice_call(p_target_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_caller_id UUID := auth.uid(); v_call_id UUID;
BEGIN
  INSERT INTO call_sessions (caller_id, callee_id, call_type, status)
  VALUES (v_caller_id, p_target_user_id, 'voice', 'calling')
  RETURNING id INTO v_call_id;
  RETURN jsonb_build_object('call_id', v_call_id, 'success', true);
END;
$$;

CREATE OR REPLACE FUNCTION end_voice_call(p_call_id UUID, p_end_reason TEXT DEFAULT 'caller_ended')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE call_sessions SET status = 'ended', ended_at = NOW(), end_reason = p_end_reason,
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at)))::INTEGER
  WHERE id = p_call_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION update_call_status(p_call_id UUID, p_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE call_sessions SET status = p_status,
    answered_at = CASE WHEN p_status = 'answered' THEN NOW() ELSE answered_at END,
    started_at = CASE WHEN p_status = 'connected' THEN NOW() ELSE started_at END
  WHERE id = p_call_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- BLOCKS
-- ============================================================

CREATE OR REPLACE FUNCTION block_user(p_blocked_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO blocks (blocker_id, blocked_id) VALUES (auth.uid(), p_blocked_id) ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION unblock_user(p_blocked_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM blocks WHERE blocker_id = auth.uid() AND blocked_id = p_blocked_id;
END;
$$;

-- ============================================================
-- COMMUNITY
-- ============================================================

CREATE OR REPLACE FUNCTION request_community_creation(
  p_name TEXT, p_description TEXT, p_country TEXT, p_state TEXT, p_city TEXT,
  p_region_type TEXT DEFAULT 'city', p_is_private BOOLEAN DEFAULT false
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_request_id UUID;
BEGIN
  INSERT INTO community_requests (name, description, country, state, city, region_type, is_private, requested_by, status)
  VALUES (p_name, p_description, p_country, p_state, p_city, p_region_type, p_is_private, auth.uid(), 'pending')
  RETURNING id INTO v_request_id;
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION assign_user_to_community(p_user_id UUID, p_community_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_community_id UUID;
BEGIN
  IF p_community_id IS NOT NULL THEN v_community_id := p_community_id;
  ELSE SELECT id INTO v_community_id FROM communities WHERE status = 'active' ORDER BY RANDOM() LIMIT 1; END IF;
  INSERT INTO community_members (community_id, user_id, role) VALUES (v_community_id, p_user_id, 'member') ON CONFLICT DO NOTHING;
  RETURN v_community_id;
END;
$$;

-- ============================================================
-- END OF FUNCTIONS
-- ============================================================
