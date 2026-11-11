import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface AdminPost {
  id: string;
  community_id: string;
  author_id: string;
  type: string;
  content: string;
  status: string;
  images: string[];
  like_count: number;
  comment_count: number;
  report_count: number;
  is_hidden: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  community?: {
    name: string;
    slug: string;
  };
}

export interface PostFilters {
  search?: string;
  status?: 'all' | 'published' | 'hidden' | 'deleted' | 'reported';
  hasImages?: boolean;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface PostStats {
  total: number;
  withImages: number;
  hidden: number;
  reported: number;
  today: number;
}

class PostService {
  async getPosts(filters: PostFilters = {}): Promise<{
    items: AdminPost[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        search,
        status = 'all',
        hasImages = false,
        dateFrom,
        dateTo,
        limit = 24,
        offset = 0,
      } = filters;

      let query = supabase.from('posts').select('*', { count: 'exact' });

      // Status filter
      if (status === 'published') query = query.eq('status', 'published').eq('is_hidden', false).eq('is_deleted', false);
      else if (status === 'hidden') query = query.eq('is_hidden', true);
      else if (status === 'deleted') query = query.eq('is_deleted', true);
      else if (status === 'reported') query = query.gt('report_count', 0);

      // Has images filter
      if (hasImages) {
        query = query.not('images', 'is', null).neq('images', '{}');
      }

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch posts:', error);
        return { items: [], total: 0, hasMore: false };
      }

      // Fetch author profiles
      const authorIds = [...new Set((data || []).map((p: any) => p.author_id).filter(Boolean))];
      let profileMap = new Map<string, any>();
      if (authorIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, is_verified')
            .in('user_id', authorIds);
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        } catch {}
      }

      // Fetch community info
      const communityIds = [...new Set((data || []).map((p: any) => p.community_id).filter(Boolean))];
      let communityMap = new Map<string, any>();
      if (communityIds.length > 0) {
        try {
          const { data: communities } = await supabase
            .from('communities')
            .select('id, name, slug')
            .in('id', communityIds);
          communityMap = new Map((communities || []).map((c: any) => [c.id, c]));
        } catch {}
      }

      let items: AdminPost[] = (data || []).map((p: any) => ({
        id: p.id,
        community_id: p.community_id,
        author_id: p.author_id,
        type: p.type,
        content: p.content,
        status: p.status,
        images: p.images || [],
        like_count: p.like_count || 0,
        comment_count: p.comment_count || 0,
        report_count: p.report_count || 0,
        is_hidden: p.is_hidden || false,
        is_deleted: p.is_deleted || false,
        created_at: p.created_at,
        updated_at: p.updated_at,
        author: profileMap.get(p.author_id)
          ? {
              display_name: profileMap.get(p.author_id)!.display_name,
              avatar_url: profileMap.get(p.author_id)!.avatar_url,
              is_verified: profileMap.get(p.author_id)!.is_verified || false,
            }
          : undefined,
        community: communityMap.get(p.community_id)
          ? {
              name: communityMap.get(p.community_id)!.name,
              slug: communityMap.get(p.community_id)!.slug,
            }
          : undefined,
      }));

      // Client-side search filter
      if (search && search.trim()) {
        const term = search.toLowerCase();
        items = items.filter(
          (p) =>
            p.content?.toLowerCase().includes(term) ||
            p.author?.display_name?.toLowerCase().includes(term)
        );
      }

      return {
        items,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    } catch (err) {
      console.error('Post service error:', err);
      return { items: [], total: 0, hasMore: false };
    }
  }

  async hidePost(postId: string, reason?: string): Promise<boolean> {
    const { data: { user: admin } } = await supabase.auth.getUser();
    if (!admin) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('posts')
      .update({
        is_hidden: true,
        hidden_at: new Date().toISOString(),
        discover_rejection_reason: reason || null,
      })
      .eq('id', postId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'hide_post',
      resourceType: 'post',
      resourceId: postId,
      changes: reason ? { reason } : undefined,
    });

    return true;
  }

  async unhidePost(postId: string): Promise<boolean> {
    const { error } = await supabase
      .from('posts')
      .update({ is_hidden: false, hidden_at: null })
      .eq('id', postId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'unhide_post',
      resourceType: 'post',
      resourceId: postId,
    });

    return true;
  }

  async deletePost(postId: string): Promise<boolean> {
    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', postId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'delete_post',
      resourceType: 'post',
      resourceId: postId,
    });

    return true;
  }

  async removeImage(postId: string, imageIndex: number): Promise<boolean> {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('images')
      .eq('id', postId)
      .single();

    if (fetchError || !post) throw new Error('Post not found');

    const images = (post.images || []) as string[];
    if (imageIndex < 0 || imageIndex >= images.length) {
      throw new Error('Invalid image index');
    }

    const remaining = images.filter((_, i) => i !== imageIndex);

    // If no images left, hide the post
    if (remaining.length === 0) {
      return this.hidePost(postId, 'All images removed');
    }

    const { error } = await supabase
      .from('posts')
      .update({ images: remaining })
      .eq('id', postId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'remove_post_image',
      resourceType: 'post',
      resourceId: postId,
      changes: { imageIndex },
    });

    return true;
  }

  async getStats(): Promise<PostStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const safeCount = async (filter?: (q: any) => any) => {
      try {
        let q = supabase.from('posts').select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        return error ? 0 : count || 0;
      } catch {
        return 0;
      }
    };

    const [total, withImages, hidden, reported, today] = await Promise.all([
      safeCount(),
      safeCount((q) => q.not('images', 'is', null).neq('images', '{}')),
      safeCount((q) => q.eq('is_hidden', true)),
      safeCount((q) => q.gt('report_count', 0)),
      safeCount((q) => q.gte('created_at', todayStart.toISOString())),
    ]);

    return { total, withImages, hidden, reported, today };
  }
}

export const postService = new PostService();