-- ALTER FUNCTION SECURITY DEFINER for the four counter triggers.
--
-- Root cause: increment/decrement trigger functions were SECURITY INVOKER,
-- meaning RLS on posts applied to the caller. When a user liked or commented
-- on someone else's post, the trigger's UPDATE to posts.like_count/comment_count
-- failed silently -- the caller did not have UPDATE permission on posts.
--
-- The notify_on_* functions were already SECURITY DEFINER, which is why
-- notifications worked but counts did not.
--
-- Applied: 2026-10-23.

ALTER FUNCTION public.increment_post_like_count() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.decrement_post_like_count() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.increment_post_comment_count() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.decrement_post_comment_count() SECURITY DEFINER SET search_path = public;
