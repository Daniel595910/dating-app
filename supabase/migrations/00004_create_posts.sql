-- ============================================
-- MIGRATION 00003: CREATE COMMUNITIES TABLE
-- ============================================

-- Community type enum
CREATE TYPE community_type AS ENUM ('country', 'state', 'city', 'region');

-- Community status enum
CREATE TYPE community_status AS ENUM ('active', 'inactive', 'archived', 'locked');

-- Communities table
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    type community_type NOT NULL DEFAULT 'country',
    status community_status NOT NULL DEFAULT 'active',
    description TEXT,
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    state VARCHAR(100),
    city VARCHAR(100),
    parent_id UUID REFERENCES communities(id) ON DELETE SET NULL,
    member_count INTEGER NOT NULL DEFAULT 0,
    post_count INTEGER NOT NULL DEFAULT 0,
    moderators UUID[] DEFAULT '{}',
    rules TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT communities_slug_format CHECK (slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT communities_country_code_format CHECK (country_code ~* '^[A-Z]{2}$'),
    CONSTRAINT communities_member_count_non_negative CHECK (member_count >= 0),
    CONSTRAINT communities_post_count_non_negative CHECK (post_count >= 0)
);

-- Indexes
CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_type ON communities(type);
CREATE INDEX idx_communities_status ON communities(status);
CREATE INDEX idx_communities_country ON communities(country, country_code);
CREATE INDEX idx_communities_parent_id ON communities(parent_id);
CREATE INDEX idx_communities_created_at ON communities(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_communities_updated_at
    BEFORE UPDATE ON communities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Community members table
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    muted_until TIMESTAMPTZ,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_reason TEXT,
    
    UNIQUE (community_id, user_id)
);

-- Indexes
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_members_user_id ON community_members(user_id);
CREATE INDEX idx_community_members_role ON community_members(community_id, role);