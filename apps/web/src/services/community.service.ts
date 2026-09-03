/**
 * Community Service
 * Handles community-related operations
 */

import { supabase } from '@/config/supabase.client';
import { Community, CommunityMember } from '@dating-app/types';

class CommunityService {
  async getCommunityById(communityId: string): Promise < Community | null > {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();
      
      if (error) throw error;
      return data as Community;
    } catch {
      return null;
    }
  }
  
  async getCommunityBySlug(slug: string): Promise < Community | null > {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as Community;
    } catch {
      return null;
    }
  }
  
  async getUserCommunities(userId: string): Promise < Community[] > {
    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);
      
      if (membershipError) throw membershipError;
      
      if (!memberships || memberships.length === 0) return [];
      
      const communityIds = memberships.map((m) => m.community_id);
      
      const { data: communities, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds);
      
      if (communityError) throw communityError;
      
      return (communities || []) as Community[];
    } catch {
      return [];
    }
  }
  
  async joinCommunity(communityId: string, userId: string): Promise < boolean > {
    try {
      const { error } = await supabase.from('community_members').insert({
        community_id: communityId,
        user_id: userId,
        role: 'member',
      });
      
      if (error) throw error;
      
      // Increment member count
      await supabase.rpc('increment_community_member_count', {
        community_id: communityId,
      });
      
      return true;
    } catch {
      return false;
    }
  }
  
  async leaveCommunity(communityId: string, userId: string): Promise < boolean > {
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Decrement member count
      await supabase.rpc('decrement_community_member_count', {
        community_id: communityId,
      });
      
      return true;
    } catch {
      return false;
    }
  }
  
  async getCommunityMembers(
    communityId: string,
    limit = 50
  ): Promise < CommunityMember[] > {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as CommunityMember[];
    } catch {
      return [];
    }
  }
  
  async isUserInCommunity(communityId: string, userId: string): Promise < boolean > {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .single();
      
      if (error) return false;
      return Boolean(data);
    } catch {
      return false;
    }
  }
}

export const communityService = new CommunityService();