-- ============================================
-- MIGRATION 00004: CREATE POSTS TABLE
-- ============================================

-- Post type enum
CREATE TYPE post_type AS ENUM ('introduction', 'looking_for', 'discussion', 'question', 'event', 'other');

-- Post status enum
CREATE TYPE post_status AS ENUM ('published', 'hidden', 'flagged', 'deleted', 'pending_review');

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type post_type NOT NULL DEFAULT 'discussion',
    content TEXT NOT NULL,
    status post_status NOT NULL DEFAULT 'published',
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    report_count INTEGER NOT NULL DEFAULT 0,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT posts_content_length CHECK (char_length(content) BETWEEN 1 AND 5000),
    CONSTRAINT posts_like_count_non_negative CHECK (like_count >= 0),
    CONSTRAINT posts_comment_count_non_negative CHECK (comment_count >= 0),
    CONSTRAINT posts_report_count_non_negative CHECK (report_count >= 0),
    CONSTRAINT posts_images_count CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 10),
    CONSTRAINT posts_tags_count CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20)
);

-- Indexes
CREATE INDEX idx_posts_community_id ON posts(community_id, created_at DESC);
CREATE INDEX idx_posts_author_id ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
CREATE INDEX idx_posts_content_search ON posts USING GIN (to_tsvector('english', content));

-- Trigger for updated_at
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Post reactions table
CREATE TABLE post_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (post_id, user_id)
);

-- Indexes
CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON post_reactions(user_id);