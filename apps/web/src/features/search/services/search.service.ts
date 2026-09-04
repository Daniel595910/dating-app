import { supabase } from '@/config/supabase.client';
import { SearchResult } from '../types/search.types';

class SearchService {
  async searchPeople(
    query: string,
    currentUserId: string,
    limit: number = 20
  ): Promise<SearchResult[]> {
    if (query.trim().length < 2) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`)
      .neq('user_id', currentUserId)
      .limit(limit);

    if (error || !data) return [];

    // Filter out blocked users (client-side as backup, server RLS is authoritative)
    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId);

    const blockedIds = new Set((blocks || []).map((b: any) => b.blocked_id));

    return data
      .filter((p: any) => !blockedIds.has(p.user_id))
      .map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        displayName: p.display_name || 'User',
        avatarUrl: p.avatar_url,
        verified: p.is_verified || false,
        age: p.age || null,
        location: p.location?.city || p.location?.state || null,
        lookingFor: p.relationship_intent || null,
        interests: p.interests || [],
      }));
  }

  async searchByInterest(interest: string, currentUserId: string, limit: number = 20): Promise<SearchResult[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .contains('interests', [interest])
      .neq('user_id', currentUserId)
      .limit(limit);

    if (error || !data) return [];

    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId);

    const blockedIds = new Set((blocks || []).map((b: any) => b.blocked_id));

    return data
      .filter((p: any) => !blockedIds.has(p.user_id))
      .map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        displayName: p.display_name || 'User',
        avatarUrl: p.avatar_url,
        verified: p.is_verified || false,
        age: p.age || null,
        location: p.location?.city || p.location?.state || null,
        lookingFor: p.relationship_intent || null,
        interests: p.interests || [],
      }));
  }
}

export const searchService = new SearchService();
