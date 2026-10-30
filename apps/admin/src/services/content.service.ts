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

    const { data, error } = await supabase.rpc('admin_list_posts', {
      p_search: search?.trim() || null,
      p_status: status,
      p_author_id: authorId || null,
      p_community_id: communityId || null,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Failed to fetch posts via RPC:', error);
      throw new Error(error.message);
    }

    const result = (data as { items?: PostRecord[]; total?: number; has_more?: boolean }) || {};
    return {
      items: result.items || [],
      total: result.total || 0,
      hasMore: result.has_more || false,
    };
  }

  async hidePost(postId: string, hidden: boolean): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_hide_post', {
      p_post_id: postId,
      p_hidden: hidden,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Post not found or permission denied');

    await auditService.logAction({
      action: hidden ? 'hide_post' : 'unhide_post',
      resourceType: 'post',
      resourceId: postId,
    });

    return true;
  }

  async deletePost(postId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_delete_post', {
      p_post_id: postId,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Post not found or permission denied');

    await auditService.logAction({
      action: 'delete_post',
      resourceType: 'post',
      resourceId: postId,
    });

    return true;
  }

  async banAuthor(userId: string, reason: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_ban_user', {
      p_user_id: userId,
      p_reason: reason,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('User not found or permission denied');

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