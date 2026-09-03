/**
 * Match Database Queries
 * Type-safe database operations for matching system
 */

import { SupabaseService, handleDatabaseError } from '../supabase';
import type { Match, CreateMatchInput, UpdateMatchInput, MatchRequest } from '@dating-app/types';

export class MatchQueries {
  private service: SupabaseService;
  
  constructor(service ? : SupabaseService) {
    this.service = service || SupabaseService.getInstance();
  }
  
  async getMatchById(matchId: string): Promise < Match | null > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (error) throw error;
      return data as Match | null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getUserMatches(userId: string): Promise < Match[] > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Match[];
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async createMatch(input: CreateMatchInput): Promise < Match > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('matches')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as Match;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async updateMatch(matchId: string, input: UpdateMatchInput): Promise < Match > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('matches')
        .update(input)
        .eq('id', matchId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Match;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async deleteMatch(matchId: string): Promise < void > {
    try {
      const { error } = await this.service
        .getClient()
        .from('matches')
        .delete()
        .eq('id', matchId);
      
      if (error) throw error;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async createMatchRequest(requesterId: string, targetId: string): Promise < MatchRequest > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('match_requests')
        .insert({
          requester_id: requesterId,
          target_id: targetId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MatchRequest;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getPendingMatchRequests(userId: string): Promise < MatchRequest[] > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('match_requests')
        .select('*')
        .eq('target_id', userId)
        .eq('status', 'pending');
      
      if (error) throw error;
      return (data || []) as MatchRequest[];
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}