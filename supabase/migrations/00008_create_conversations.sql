-- ============================================
-- MIGRATION 00007: CREATE MATCHES TABLE
-- ============================================

-- Match stage enum
CREATE TYPE match_stage AS ENUM ('getting_to_know', 'compatibility_check', 'matched', 'rejected', 'expired');

-- Match status enum
CREATE TYPE match_status AS ENUM ('active', 'completed', 'cancelled', 'expired');

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stage match_stage NOT NULL DEFAULT 'getting_to_know',
    status match_status NOT NULL DEFAULT 'active',
    match_score INTEGER,
    compatibility_answers JSONB,
    matched_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT matches_users_different CHECK (user1_id != user2_id),
    CONSTRAINT matches_score_range CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
    UNIQUE (user1_id, user2_id)
);

-- Indexes
CREATE INDEX idx_matches_user1_id ON matches(user1_id, created_at DESC);
CREATE INDEX idx_matches_user2_id ON matches(user2_id, created_at DESC);
CREATE INDEX idx_matches_stage ON matches(stage);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Match requests table
CREATE TABLE match_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT match_requests_users_different CHECK (requester_id != target_id),
    CONSTRAINT match_requests_message_length CHECK (message IS NULL OR char_length(message) <= 500),
    UNIQUE (requester_id, target_id)
);

-- Indexes
CREATE INDEX idx_match_requests_requester_id ON match_requests(requester_id);
CREATE INDEX idx_match_requests_target_id ON match_requests(target_id, status);

-- Trigger for updated_at
CREATE TRIGGER update_match_requests_updated_at
    BEFORE UPDATE ON match_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Match preferences table
CREATE TABLE match_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    age_range JSONB NOT NULL DEFAULT '{"min": 18, "max": 100}',
    distance_radius INTEGER NOT NULL DEFAULT 100,
    relationship_intent TEXT[] DEFAULT '{}',
    deal_breakers TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT match_preferences_distance_range CHECK (distance_radius BETWEEN 1 AND 1000)
);

-- Indexes
CREATE INDEX idx_match_preferences_user_id ON match_preferences(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_match_preferences_updated_at
    BEFORE UPDATE ON match_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();