import { useState, useCallback, useRef } from 'react';
import { communityService } from '../services/community.service';

interface UsePostInteractionsResult {
  pendingLikes: Set<string>;
  likePost: (postId: string, currentlyLiked: boolean, likeCount: number) => Promise<void>;
}

export function usePostInteractions(userId: string | null): UsePostInteractionsResult {
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());

  const likePost = useCallback(
    async (postId: string, currentlyLiked: boolean, likeCount: number) => {
      if (!userId || pendingRef.current.has(postId)) return;

      // Mark as pending to prevent duplicate requests
      pendingRef.current.add(postId);
      setPendingLikes(new Set(pendingRef.current));

      try {
        if (currentlyLiked) {
          await communityService.unlikePost(postId, userId);
        } else {
          await communityService.likePost(postId, userId);
        }
      } catch (err) {
        console.error('Like mutation failed:', err);
        throw err;
      } finally {
        pendingRef.current.delete(postId);
        setPendingLikes(new Set(pendingRef.current));
      }
    },
    [userId]
  );

  return { pendingLikes, likePost };
}
