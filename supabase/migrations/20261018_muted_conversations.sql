-- ============================================================
-- Muted conversations: user-level mute for chat notifications
--
-- Used by:
--   - notification-sender edge fn: skip push if conversation muted
--   - (future) chat UI: show mute icon in conversation header
--
-- Users can mute a conversation for a duration (1h, 8h, 1d, forever).
-- After muted_until, mutes expire automatically (no cleanup needed).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.muted_conversations (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  muted_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_muted_conversations_active
  ON public.muted_conversations (user_id, conversation_id, muted_until);

ALTER TABLE public.muted_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own mutes
DROP POLICY IF EXISTS "users manage own mutes" ON public.muted_conversations;
CREATE POLICY "users manage own mutes"
  ON public.muted_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);