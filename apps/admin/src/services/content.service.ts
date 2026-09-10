import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface PostRecord {
  id: string;
  author_id: string;
  content: string;
  media?: any;
  community_id?: string | null;
  is_hidden?: boolean;
  is_deleted?: boolean;
  hidden_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
  // Enriched
  author?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  report_count?: number;
}

export interface CommentRecord {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  is_hidden?: boolean;
  is_deleted?: boolean;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface ContentFilters {
  search?: string;
  status?: 'all' | 'visible' | 'hidden' | 'deleted' | 'reported';
  authorId?: string;
  communityId?: string;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ContentResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

class ContentService {
  async getPosts(filters: ContentFilters = {}): Promise<ContentResult<PostRecord>> {
    const {
      search,
      status = 'all',
      authorId,
      communityId,
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    let query = supabase.from('posts').select('*', { count: 'exact' });

    // Search
    if (search && search.trim()) {
      query = query.ilike('content', `%${search.trim()}%`);
    }

    // Filters
    if (authorId) {
      query = query.eq('author_id', authorId);
    }

    if (communityId) {
      query = query.eq('community_id', communityId);
    }

    // Status filter — defensive: only apply if the column exists
    try {
      switch (status) {
        case 'visible':
          query = query.or('is_hidden.is.null,is_hidden.eq.false').or('is_deleted.is.null,is_deleted.eq.false');
          break;
        case 'hidden':
          query = query.eq('is_hidden', true);
          break;
        case 'deleted':
          query = query.eq('is_deleted', true);
          break;
      }
    } catch (err) {
      console.warn('Failed to apply status filter:', err);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch posts:', error);
      throw new Error(error.message);
    }

    const posts = await this.enrichPosts((data || []) as PostRecord[]);

    return {
      items: posts,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  private async enrichPosts(posts: PostRecord[]): Promise<PostRecord[]> {
    if (posts.length === 0) return [];

    const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean))];

    let profileMap = new Map<string, any>();
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, is_verified')
        .in('user_id', authorIds);

      profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    } catch (err) {
      console.warn('Failed to enrich posts with profiles:', err);
    }

    // Fetch report counts per post
    const postIds = posts.map((p) => p.id);
    const reportCounts = new Map<string, number>();

    try {
      const { data: reports } = await supabase
        .from('reports')
        .select('target_id')
        .in('target_id', postIds)
        .eq('status', 'pending');

      (reports || []).forEach((r: any) => {
        reportCounts.set(r.target_id, (reportCounts.get(r.target_id) || 0) + 1);
      });
    } catch (err) {
      console.warn('Failed to fetch report counts:', err);
    }

    return posts.map((p) => {
      const author = profileMap.get(p.author_id);
      return {
        ...p,
        author: author
          ? {
              display_name: author.display_name,
              avatar_url: author.avatar_url,
              is_verified: author.is_verified || false,
            }
          : undefined,
        report_count: reportCounts.get(p.id) || 0,
      };
    });
  }

  async hidePost(postId: string, hidden: boolean): Promise<boolean> {
    const updates = hidden
      ? { is_hidden: true, hidden_at: new Date().toISOString() }
      : { is_hidden: false, hidden_at: null };

    const { error } = await supabase.from('posts').update(updates).eq('id', postId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: hidden ? 'hide_post' : 'unhide_post',
      resourceType: 'post',
      resourceId: postId,
    });

    return true;
  }

  async deletePost(postId: string): Promise<boolean> {
    const { error } = await supabase
      .from('posts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_post',
      resourceType: 'post',
      resourceId: postId,
    });

    return true;
  }

  async banAuthor(userId: string, reason: string): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'ban_user_from_content',
      resourceType: 'profile',
      resourceId: userId,
      changes: { reason },
    });

    return true;
  }
}

export const contentService = new ContentService();
