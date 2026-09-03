import { useEffect, useRef } from 'react';
import { supabase } from '@/config/supabase.client';

interface UseCommunityRealtimeOptions {
  communityId: string | null;
  onNewPost?: (post: any) => void;
  onPostUpdated?: (post: any) => void;
  onPostDeleted?: (postId: string) => void;
  onReactionAdded?: (reaction: any) => void;
  onReactionRemoved?: (reaction: any) => void;
  onCommentAdded?: (comment: any) => void;
}

export function useCommunityRealtime({
  communityId,
  onNewPost,
  onPostUpdated,
  onPostDeleted,
  onReactionAdded,
  onReactionRemoved,
  onCommentAdded,
}: UseCommunityRealtimeOptions): void {
  const callbacksRef = useRef({
    onNewPost,
    onPostUpdated,
    onPostDeleted,
    onReactionAdded,
    onReactionRemoved,
    onCommentAdded,
  });

  callbacksRef.current = {
    onNewPost,
    onPostUpdated,
    onPostDeleted,
    onReactionAdded,
    onReactionRemoved,
    onCommentAdded,
  };

  useEffect(() => {
    if (!communityId) return;

    const channel = supabase.channel(`community:${communityId}`);

    // New posts
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `community_id=eq.${communityId}`,
      },
      (payload) => {
        callbacksRef.current.onNewPost?.(payload.new);
      }
    );

    // Updated posts
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts',
        filter: `community_id=eq.${communityId}`,
      },
      (payload) => {
        callbacksRef.current.onPostUpdated?.(payload.new);
      }
    );

    // Deleted posts
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
        filter: `community_id=eq.${communityId}`,
      },
      (payload) => {
        callbacksRef.current.onPostDeleted?.(payload.old.id);
      }
    );

    // New comments
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      },
      (payload) => {
        callbacksRef.current.onCommentAdded?.(payload.new);
      }
    );

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [communityId]);
}
