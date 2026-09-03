-- ============================================
-- MIGRATION 00009: CREATE MESSAGES TABLE
-- ============================================

-- Message type enum
CREATE TYPE message_type AS ENUM ('text', 'image', 'emoji', 'system');

-- Message status enum
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type message_type NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    status message_status NOT NULL DEFAULT 'sent',
    media_url TEXT,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT messages_content_length CHECK (char_length(content) <= 10000),
    CONSTRAINT messages_media_url_format CHECK (media_url IS NULL OR media_url ~* '^https?://')
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_id ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();