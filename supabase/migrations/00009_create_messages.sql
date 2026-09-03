-- ============================================
-- MIGRATION 00008: CREATE CONVERSATIONS TABLE
-- ============================================

-- Conversation status enum
CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'deleted');

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    participant_ids UUID[] NOT NULL,
    status conversation_status NOT NULL DEFAULT 'active',
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    unread_counts JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT conversations_participants_count CHECK (array_length(participant_ids, 1) >= 2),
    CONSTRAINT conversations_last_message_preview_length CHECK (last_message_preview IS NULL OR char_length(last_message_preview) <= 100)
);

-- Indexes
CREATE INDEX idx_conversations_match_id ON conversations(match_id);
CREATE INDEX idx_conversations_participants ON conversations USING GIN (participant_ids);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Conversation participants table
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    last_read_at TIMESTAMPTZ,
    
    UNIQUE (conversation_id, user_id)
);

-- Indexes
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);