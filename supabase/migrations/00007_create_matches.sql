-- ============================================
-- MIGRATION 00006: CREATE REACTIONS SYSTEM
-- ============================================

-- Reaction type enum
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'haha', 'wow', 'sad', 'angry');

-- Function to increment post like count
CREATE OR REPLACE FUNCTION increment_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to decrement post like count
CREATE OR REPLACE FUNCTION decrement_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Function to increment comment like count
CREATE OR REPLACE FUNCTION increment_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to decrement comment like count
CREATE OR REPLACE FUNCTION decrement_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Function to increment post comment count
CREATE OR REPLACE FUNCTION increment_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to decrement post comment count
CREATE OR REPLACE FUNCTION decrement_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Triggers for post reactions
CREATE TRIGGER increment_post_likes
    AFTER INSERT ON post_reactions
    FOR EACH ROW
    EXECUTE FUNCTION increment_post_like_count();

CREATE TRIGGER decrement_post_likes
    AFTER DELETE ON post_reactions
    FOR EACH ROW
    EXECUTE FUNCTION decrement_post_like_count();

-- Triggers for comment reactions
CREATE TRIGGER increment_comment_likes
    AFTER INSERT ON comment_reactions
    FOR EACH ROW
    EXECUTE FUNCTION increment_comment_like_count();

CREATE TRIGGER decrement_comment_likes
    AFTER DELETE ON comment_reactions
    FOR EACH ROW
    EXECUTE FUNCTION decrement_comment_like_count();

-- Triggers for comments
CREATE TRIGGER increment_post_comments
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION increment_post_comment_count();

CREATE TRIGGER decrement_post_comments
    AFTER DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION decrement_post_comment_count();