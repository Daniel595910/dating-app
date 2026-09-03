/**
 * Matching Service
 * Handles matching operations
 */

import { supabase } from '@/config/supabase.client';
import { Match, MatchRequest } from '@dating-app/types';

class MatchingService {
  async getUserMatches(userId: string): Promise < Match[] > {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Match[];
    } catch {
      return [];
    }
  }
  
  async getMatchById(matchId: string): Promise < Match | null > {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (error) throw error;
      return data as Match;
    } catch {
      return null;
    }
  }
  
  async sendMatchRequest(
    requesterId: string,
    targetId: string,
    message ? : string
  ): Promise < MatchRequest | null > {
    try {
      const { data, error } = await supabase
        .from('match_requests')
        .insert({
          requester_id: requesterId,
          target_id: targetId,
          message: message || null,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MatchRequest;
    } catch {
      return null;
    }
  }
  
  async getPendingRequests(userId: string): Promise < MatchRequest[] > {
    try {
      const { data, error } = await supabase
        .from('match_requests')
        .select('*')
        .eq('target_id', userId)
        .eq('status', 'pending');
      
      if (error) throw error;
      return (data || []) as MatchRequest[];
    } catch {
      return [];
    }
  }
  
  async acceptMatchRequest(requestId: string): Promise < boolean > {
    try {
      const { error } = await supabase
        .from('match_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
  
  async rejectMatchRequest(requestId: string): Promise < boolean > {
    try {
      const { error } = await supabase
        .from('match_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
  
  async createMatch(user1Id: string, user2Id: string): Promise < Match | null > {
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          user1_id: user1Id,
          user2_id: user2Id,
          stage: 'getting_to_know',
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Match;
    } catch {
      return null;
    }
  }
  
  async updateMatchStage(
    matchId: string,
    stage: Match['stage']
  ): Promise < boolean > {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ stage })
        .eq('id', matchId);
      
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
}

export const matchingService = new MatchingService();