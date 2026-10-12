import { useState, useEffect, useCallback } from 'react';
import { CommunityInfo, CommunityMember } from '../types/community.types';
import { communityService } from '../services/community.service';

const SELECTED_COMMUNITY_KEY = 'selectedCommunityId';

interface UseCommunityResult {
  community: CommunityInfo | null;
  membership: CommunityMember | null;
  memberships: CommunityMember[];
  loading: boolean;
  error: string | null;
  onlineCount: number;
  refresh: () => Promise<void>;
  setSelectedCommunity: (communityId: string) => void;
}

export function useCommunity(userId: string | null): UseCommunityResult {
  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [membership, setMembership] = useState<CommunityMember | null>(null);
  const [memberships, setMemberships] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return localStorage.getItem(SELECTED_COMMUNITY_KEY); } catch { return null; }
  });

  const loadCommunity = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch ALL memberships
      const allMemberships = await communityService.getAllUserCommunities(userId);

      if (allMemberships.length === 0) {
        setMemberships([]);
        setMembership(null);
        setCommunity(null);
        setLoading(false);
        return;
      }

      setMemberships(allMemberships);

      // Pick the "current" community:
      // 1. The one in localStorage (if the user is a member of it)
      // 2. Otherwise the first membership
      const preferred = selectedId
        ? allMemberships.find((m) => m.communityId === selectedId)
        : null;
      const currentMembership = preferred ?? allMemberships[0] ?? null;

      if (!currentMembership) {
        setMembership(null);
        setCommunity(null);
        setLoading(false);
        return;
      }

      setMembership(currentMembership);

      // Persist it if it was a fallback
      if (currentMembership.communityId !== selectedId) {
        try { localStorage.setItem(SELECTED_COMMUNITY_KEY, currentMembership.communityId); } catch {}
      }

      // Fetch the community info
      const info = await communityService.getCommunityInfo(currentMembership.communityId);
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
  }, [userId, selectedId]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  // Subscribe to presence whenever community changes
  useEffect(() => {
    if (!community?.id || !userId) return;

    const unsubscribe = communityService.subscribeToPresence(
      community.id,
      userId,
      setOnlineCount
    );

    return () => {
      unsubscribe();
    };
  }, [community?.id, userId]);

  const setSelectedCommunity = useCallback((communityId: string) => {
    try { localStorage.setItem(SELECTED_COMMUNITY_KEY, communityId); } catch {}
    setSelectedId(communityId);
  }, []);

  return {
    community,
    membership,
    memberships,
    loading,
    error,
    onlineCount,
    refresh: loadCommunity,
    setSelectedCommunity,
  };
}
