import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  root_id: string | null;
  content: string;
  content_type: 'text' | 'emoji' | 'gif' | 'sticker' | 'gift';
  media_url: string | null;
  media_id: string | null;
  metadata: Record<string, any>;
  status: 'published' | 'hidden' | 'flagged' | 'deleted';
  like_count: number;
  report_count: number;
  is_edited: boolean;
  edited_at: string | null;
  is_hidden: boolean | null;
  hidden_at: string | null;
  is_deleted: boolean | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Enriched
  author?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  post?: {
    content: string;
    author_id: string;
  };
}

export interface CommentFilters {
  search?: string;
  status?: 'all' | 'published' | 'hidden' | 'deleted' | 'reported' | 'flagged';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'created_at' | 'report_count' | 'like_count';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

class CommentService {
  async getComments(filters: CommentFilters = {}): Promise<{
    items: Comment[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        search,
        status = 'all',
        dateFrom,
        dateTo,
        sortBy = 'created_at',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = filters;

      let query = supabase.from('comments').select('*', { count: 'exact' });

      if (search && search.trim()) {
        query = query.ilike('content', `%${search.trim()}%`);
      }

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      try {
        switch (status) {
          case 'published':
            query = query.eq('status', 'published');
            break;
          case 'hidden':
            query = query.eq('is_hidden', true);
            break;
          case 'deleted':
            query = query.eq('is_deleted', true);
            break;
          case 'reported':
            query = query.gt('report_count', 0);
            break;
          case 'flagged':
            query = query.eq('status', 'flagged');
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
        console.error('Failed to fetch comments:', error);
        return { items: [], total: 0, hasMore: false };
      }

      const items = await this.enrichComments((data || []) as Comment[]);

      return {
        items,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch {
      return { items: [], total: 0, hasMore: false };
    }
  }

  private async enrichComments(comments: Comment[]): Promise<Comment[]> {
    if (comments.length === 0) return [];

    const authorIds = [...new Set(comments.map((c) => c.author_id).filter(Boolean))];
    const postIds = [...new Set(comments.map((c) => c.post_id).filter(Boolean))];

    const [profilesRes, postsRes] = await Promise.all([
      authorIds.length > 0
        ? supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, is_verified')
            .in('user_id', authorIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase.from('posts').select('id, content, author_id').in('id', postIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const postMap = new Map((postsRes.data || []).map((p: any) => [p.id, p]));

    return comments.map((c) => {
      const author = profileMap.get(c.author_id);
      const post = postMap.get(c.post_id);
      return {
        ...c,
        author: author
          ? {
              display_name: author.display_name,
              avatar_url: author.avatar_url,
              is_verified: author.is_verified || false,
            }
          : undefined,
        post: post
          ? {
              content: post.content?.substring(0, 200) || '',
              author_id: post.author_id,
            }
          : undefined,
      };
    });
  }

  async hideComment(commentId: string, hidden: boolean): Promise<boolean> {
    const updates = hidden
      ? {
          is_hidden: true,
          hidden_at: new Date().toISOString(),
          status: 'hidden' as const,
        }
      : {
          is_hidden: false,
          hidden_at: null,
          status: 'published' as const,
        };

    const { error } = await supabase.from('comments').update(updates).eq('id', commentId);
    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: hidden ? 'hide_comment' : 'unhide_comment',
      resourceType: 'comment',
      resourceId: commentId,
    });

    return true;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        status: 'deleted',
      })
      .eq('id', commentId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_comment',
      resourceType: 'comment',
      resourceId: commentId,
    });

    return true;
  }

  async flagComment(commentId: string, reason: string): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .update({ status: 'flagged' })
      .eq('id', commentId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'flag_comment',
      resourceType: 'comment',
      resourceId: commentId,
      changes: { reason },
    });

    return true;
  }

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const safeCount = async (filter?: (q: any) => any) => {
      try {
        let q = supabase.from('comments').select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        return error ? 0 : count || 0;
      } catch {
        return 0;
      }
    };

    const [total, today, hidden, deleted, reported] = await Promise.all([
      safeCount(),
      safeCount((q) => q.gte('created_at', todayStart)),
      safeCount((q) => q.eq('is_hidden', true)),
      safeCount((q) => q.eq('is_deleted', true)),
      safeCount((q) => q.gt('report_count', 0)),
    ]);

    return { total, today, hidden, deleted, reported };
  }
}

export const commentService = new CommentService();
