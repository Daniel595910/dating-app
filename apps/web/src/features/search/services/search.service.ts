import { supabase } from '@/config/supabase.client';
import { SearchResult } from '../types/search.types';

class SearchService {
  async searchPeople(
    query: string,
    currentUserId: string,
    limit: number = 20
  ): Promise<SearchResult[]> {
    if (query.trim().length < 1) return [];

    // Strip emojis and special characters
    const cleanQuery = this.cleanQuery(query);
    if (cleanQuery.length < 1) return [];

    const { data, error } = await supabase.rpc('search_people', {
      p_query: cleanQuery,
      p_current_user_id: currentUserId,
      p_limit: limit,
    });

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.user_id,
      userId: p.user_id,
      displayName: p.display_name || 'User',
      avatarUrl: p.avatar_url,
      verified: p.is_verified || false,
      age: p.birth_date ? this.calculateAge(p.birth_date) : null,
      location: this.formatLocation(p.location),
      lookingFor: p.relationship_intent || null,
      interests: p.interests || [],
      bio: p.bio || null,
      occupation: p.occupation || null,
      languages: p.languages || [],
      gender: p.gender || null,
    }));
  }

  async searchCommunities(query: string, limit: number = 20): Promise<any[]> {
    if (query.trim().length < 1) return [];
    
    // Strip emojis and special characters
    const cleanQuery = this.cleanQuery(query);
    if (cleanQuery.length < 1) return [];

    const { data, error } = await supabase.rpc('search_communities', {
      p_query: cleanQuery,
      p_limit: limit,
    });
    
    if (error) {
      console.error('Community search error:', error);
      return [];
    }
    
    return data || [];
  }

  async searchPosts(query: string, currentUserId: string, limit: number = 10): Promise<any[]> {
    const cleanQuery = this.cleanQuery(query);
    if (cleanQuery.length < 1) return [];

    const { data, error } = await supabase
      .from('posts')
      .select('id, author_id, content, created_at, like_count, comment_count')
      .eq('status', 'published')
      .ilike('content', `%${cleanQuery}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    // Fetch author profiles
    const authorIds = [...new Set(data.map((p: any) => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', authorIds);

    const profileMap = new Map();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.user_id, {
        name: p.display_name || 'User',
        avatarUrl: p.avatar_url || null,
      });
    });

    return data.map((p: any) => ({
      id: p.id,
      authorId: p.author_id,
      authorName: profileMap.get(p.author_id)?.name || 'User',
      authorAvatar: profileMap.get(p.author_id)?.avatarUrl || null,
      content: p.content,
      createdAt: p.created_at,
      likeCount: p.like_count || 0,
      commentCount: p.comment_count || 0,
    }));
  }

  async searchTags(query: string, limit: number = 10): Promise<string[]> {
    const cleanQuery = this.cleanQuery(query);
    if (cleanQuery.length < 1) return [];

    const { data, error } = await supabase
      .from('posts')
      .select('tags')
      .eq('status', 'published')
      .not('tags', 'is', null)
      .limit(100);

    if (error || !data) return [];

    const allTags = new Set<string>();
    data.forEach((p: any) => {
      (p.tags || []).forEach((tag: string) => {
        if (tag.toLowerCase().includes(cleanQuery.toLowerCase())) {
          allTags.add(tag);
        }
      });
    });

    return [...allTags].slice(0, limit);
  }

  // Remove emojis and special characters from query
  private cleanQuery(query: string): string {
    return query
      .replace(/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F02F}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private calculateAge(birthDate: string): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private formatLocation(location: any): string | null {
    if (!location) return null;
    const parts = [location.city, location.state, location.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
}

export const searchService = new SearchService();

