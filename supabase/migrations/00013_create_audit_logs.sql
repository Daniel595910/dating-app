-- ============================================
-- MIGRATION 00012: CREATE REPORTS TABLE
-- ============================================

-- Report type enum
CREATE TYPE report_type AS ENUM ('user', 'post', 'comment', 'message', 'photo');

-- Report reason enum
CREATE TYPE report_reason AS ENUM (
    'harassment',
    'spam',
    'inappropriate_content',
    'fake_profile',
    'scam',
    'underage',
    'violence',
    'hate_speech',
    'other'
);

-- Report status enum
CREATE TYPE report_status AS ENUM ('pending', 'under_review', 'resolved', 'dismissed', 'escalated');

-- Report severity enum
CREATE TYPE report_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type report_type NOT NULL,
    reason report_reason NOT NULL,
    description TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'pending',
    severity report_severity NOT NULL DEFAULT 'low',
    target_id UUID NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT reports_description_length CHECK (char_length(description) BETWEEN 1 AND 1000)
);

-- Indexes
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id, created_at DESC);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_status ON reports(status, created_at);
CREATE INDEX idx_reports_severity ON reports(severity);
CREATE INDEX idx_reports_target_id ON reports(target_id);

-- Trigger for updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Moderation actions table
CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type report_type NOT NULL,
    target_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('warn', 'hide', 'delete', 'suspend', 'ban', 'restore')),
    reason TEXT NOT NULL,
    duration INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_moderation_actions_moderator_id ON moderation_actions(moderator_id, created_at DESC);
CREATE INDEX idx_moderation_actions_target ON moderation_actions(target_type, target_id);
CREATE INDEX idx_moderation_actions_created_at ON moderation_actions(created_at DESC);