/**
 * Community Store
 * Community state management using Zustand
 */

import { create } from 'zustand';
import { Community } from '@dating-app/types';
import { communityService } from '@/services/community.service';

interface CommunityState {
  communities: Community[];
  currentCommunity: Community | null;
  loading: boolean;
  error: string | null;
  setCurrentCommunity: (community: Community | null) => void;
  loadCommunities: (userId: string) => Promise < void > ;
  loadCommunity: (communityId: string) => Promise < void > ;
  joinCommunity: (communityId: string, userId: string) => Promise < boolean > ;
  leaveCommunity: (communityId: string, userId: string) => Promise < boolean > ;
  clearError: () => void;
}

export const useCommunityStore = create < CommunityState > ((set, get) => ({
  communities: [],
  currentCommunity: null,
  loading: false,
  error: null,
  
  setCurrentCommunity: (community) => set({ currentCommunity: community }),
  
  clearError: () => set({ error: null }),
  
  loadCommunities: async (userId) => {
    set({ loading: true, error: null });
    
    try {
      const communities = await communityService.getUserCommunities(userId);
      set({ communities, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load communities',
        loading: false,
      });
    }
  },
  
  loadCommunity: async (communityId) => {
    set({ loading: true, error: null });
    
    try {
      const community = await communityService.getCommunityById(communityId);
      set({ currentCommunity: community, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load community',
        loading: false,
      });
    }
  },
  
  joinCommunity: async (communityId, userId) => {
    set({ error: null });
    
    try {
      const success = await communityService.joinCommunity(communityId, userId);
      if (success) {
        await get().loadCommunities(userId);
      }
      return success;
    } catch (error: any) {
      set({ error: error.message || 'Failed to join community' });
      return false;
    }
  },
  
  leaveCommunity: async (communityId, userId) => {
    set({ error: null });
    
    try {
      const success = await communityService.leaveCommunity(communityId, userId);
      if (success) {
        await get().loadCommunities(userId);
      }
      return success;
    } catch (error: any) {
      set({ error: error.message || 'Failed to leave community' });
      return false;
    }
  },
}));