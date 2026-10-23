-- Enable Supabase Realtime on all app-subscribed tables.
--
-- DISCOVERY: Only call_sessions was in the supabase_realtime publication.
-- Missing tables silently broke realtime for chat, comments, presence,
-- notifications, and the community new-post banner. Code subscriptions
-- were correct; DB config was the issue.
--
-- Applied to production on 2026-10-23.

DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.posts';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'comments') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.comments';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'presence') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.presence';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $;

-- Verification: should return 7 rows (call_sessions + 6 newly added)
-- SELECT tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime' ORDER BY tablename;
