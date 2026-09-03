import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase.client';
import { CommunityInfo, CommunityMember } from '../types/community.types';
import { communityService } from '../services/community.service';

interface UseCommunityResult {
  community: CommunityInfo | null;
  membership: CommunityMember | null;
  loading: boolean;
  error: string | null;
  onlineCount: number;
  refresh: () => Promise<void>;
}

export function useCommunity(userId: string | null): UseCommunityResult {
  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [membership, setMembership] = useState<CommunityMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const loadCommunity = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's membership
      const userMembership = await communityService.getUserCommunityMembership(userId);

      if (!userMembership) {
        setMembership(null);
        setCommunity(null);
        setLoading(false);
        return;
      }

      setMembership(userMembership);

      // Get community info
      const info = await communityService.getCommunityInfo(userMembership.communityId);
      if (info) {
        setCommunity(info);
      } else {
        setError('Community not found');
      }
    } catch (err) {
      console.error('useCommunity error:', err);
      setError('Failed to load community');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  // Subscribe to presence when community is loaded
  useEffect(() => {
    if (!community || !userId) return;

    const unsubscribe = communityService.subscribeToPresence(
      community.id,
      userId,
      setOnlineCount
    );

    return () => {
      unsubscribe();
    };
  }, [community?.id, userId]);

  return {
    community,
    membership,
    loading,
    error,
    onlineCount,
    refresh: loadCommunity,
  };
}
