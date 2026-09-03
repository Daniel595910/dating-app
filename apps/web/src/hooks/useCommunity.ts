/**
 * useCommunity Hook
 * Community data management
 */

import { useState, useEffect, useCallback } from 'react';
import { Community } from '@dating-app/types';
import { communityService } from '@/services/community.service';

interface UseCommunityReturn {
  communities: Community[];
  currentCommunity: Community | null;
  loading: boolean;
  error: string | null;
  loadCommunities: (userId: string) => Promise < void > ;
  loadCommunity: (communityId: string) => Promise < void > ;
  joinCommunity: (communityId: string, userId: string) => Promise < boolean > ;
  leaveCommunity: (communityId: string, userId: string) => Promise < boolean > ;
}

export function useCommunity(): UseCommunityReturn {
  const [communities, setCommunities] = useState < Community[] > ([]);
  const [currentCommunity, setCurrentCommunity] = useState < Community | null > (null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const loadCommunities = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const userCommunities = await communityService.getUserCommunities(userId);
      setCommunities(userCommunities);
    } catch (err: any) {
      setError(err.message || 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const loadCommunity = useCallback(async (communityId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const community = await communityService.getCommunityById(communityId);
      setCurrentCommunity(community);
    } catch (err: any) {
      setError(err.message || 'Failed to load community');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const joinCommunity = useCallback(async (communityId: string, userId: string) => {
    setError(null);
    
    try {
      const success = await communityService.joinCommunity(communityId, userId);
      if (success) {
        await loadCommunities(userId);
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to join community');
      return false;
    }
  }, [loadCommunities]);
  
  const leaveCommunity = useCallback(async (communityId: string, userId: string) => {
    setError(null);
    
    try {
      const success = await communityService.leaveCommunity(communityId, userId);
      if (success) {
        await loadCommunities(userId);
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to leave community');
      return false;
    }
  }, [loadCommunities]);
  
  return {
    communities,
    currentCommunity,
    loading,
    error,
    loadCommunities,
    loadCommunity,
    joinCommunity,
    leaveCommunity,
  };
}