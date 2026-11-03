-- Add message_reactions to realtime publication.
--
-- Previously missing from 20261023_enable_realtime_publication.sql.
-- Without this, reaction INSERT/DELETE events never fire, so reactions
-- added by one user don't appear on the other user's screen until
-- page reload.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'message_reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions';
  END IF;
END $$;