-- Backfill denormalized counters on posts created before their triggers existed.
--
-- DISCOVERY: posts.like_count and posts.comment_count were 0 for older posts
-- even though post_reactions and comments had rows for them.
-- Root cause: the increment triggers were added after the initial data.
-- Triggers do not retroactively fire, so existing rows had stale counts.
--
-- Applied to production on 2026-10-23. Verified: all counts now match.

UPDATE posts p
SET like_count = (
  SELECT COUNT(*) FROM post_reactions 
  WHERE post_id = p.id AND reaction_type = 'like'
);

UPDATE posts p
SET comment_count = (
  SELECT COUNT(*) FROM comments 
  WHERE post_id = p.id AND status = 'published'
);
