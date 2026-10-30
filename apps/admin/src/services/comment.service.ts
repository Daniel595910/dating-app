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

    const { data, error } = await supabase.rpc('admin_list_comments', {
      p_search: search?.trim() || null,
      p_status: status,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Failed to fetch comments via RPC:', error);
      return { items: [], total: 0, hasMore: false };
    }

    const result = (data as { items?: Comment[]; total?: number; has_more?: boolean }) || {};
    return {
      items: result.items || [],
      total: result.total || 0,
      hasMore: result.has_more || false,
    };
  }

  async hideComment(commentId: string, hidden: boolean): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_hide_comment', {
      p_comment_id: commentId,
      p_hidden: hidden,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Comment not found or permission denied');

    await auditService.logAction({
      action: hidden ? 'hide_comment' : 'unhide_comment',
      resourceType: 'comment',
      resourceId: commentId,
    });

    return true;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_delete_comment', {
      p_comment_id: commentId,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Comment not found or permission denied');

    await auditService.logAction({
      action: 'delete_comment',
      resourceType: 'comment',
      resourceId: commentId,
    });

    return true;
  }

  async flagComment(commentId: string, reason: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_flag_comment', {
      p_comment_id: commentId,
      p_reason: reason,
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Comment not found or permission denied');

    await auditService.logAction({
      action: 'flag_comment',
      resourceType: 'comment',
      resourceId: commentId,
      changes: { reason },
    });

    return true;
  }

  async getStats() {
    const { data, error } = await supabase.rpc('admin_comment_stats');

    if (error || !data) {
      return { total: 0, today: 0, hidden: 0, deleted: 0, reported: 0 };
    }

    const result = data as {
      total?: number; today?: number; hidden?: number; deleted?: number; reported?: number;
    };

    return {
      total: result.total || 0,
      today: result.today || 0,
      hidden: result.hidden || 0,
      deleted: result.deleted || 0,
      reported: result.reported || 0,
    };
  }
}

export const commentService = new CommentService();