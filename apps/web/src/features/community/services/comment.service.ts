import { supabase } from '@/config/supabase.client';
import type { Comment } from '../types/community.types';

const COMMENTS_PAGE_SIZE = 20;
const REPLIES_PAGE_SIZE = 5;

export const commentService = {
  async fetchTopLevelComments(postId: string, cursor?: string | null) {
    let query = supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('status', 'published')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(COMMENTS_PAGE_SIZE + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const hasMore = data && data.length > COMMENTS_PAGE_SIZE;
    const comments = hasMore ? data.slice(0, COMMENTS_PAGE_SIZE) : data || [];
    const nextCursor = comments.length > 0 ? comments[comments.length - 1].created_at : null;

    return { comments: comments as Comment[], hasMore, nextCursor };
  },

  async fetchReplies(rootIds: string[]) {
    if (rootIds.length === 0) return [] as Comment[];
    
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('status', 'published')
      .in('root_id', rootIds)
      .not('parent_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) throw error;
    return (data || []) as Comment[];
  },

  async createComment(input: {
    postId: string;
    authorId: string;
    parentId?: string | null;
    rootId?: string | null;
    content: string;
    contentType?: string;
    mediaUrl?: string | null;
    mediaId?: string | null;
    metadata?: Record<string, any>;
  }) {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: input.postId,
        author_id: input.authorId,
        parent_id: input.parentId || null,
        root_id: input.rootId || null,
        content: input.content,
        content_type: input.contentType || 'text',
        media_url: input.mediaUrl || null,
        media_id: input.mediaId || null,
        metadata: input.metadata || {},
        status: 'published'
      })
      .select()
      .single();

    if (error) throw error;

    // If top-level comment, set root_id to own id
    if (!input.parentId) {
      const { data: updatedData, error: updateError } = await supabase
        .from('comments')
        .update({ root_id: data.id })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedData as Comment;
    }

    return data as Comment;
  },

  async deleteComment(commentId: string) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  },

  async toggleReaction(commentId: string, userId: string, reactionType: string = 'like') {
    try {
      // First try to check if reaction exists
      const { data: existing, error: checkError } = await supabase
        .from('comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      // If there's an error with the query, log it but continue
      if (checkError) {
        console.warn('Error checking reaction:', checkError);
      }

      if (existing) {
        // Remove reaction
        const { error: deleteError } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('id', existing.id);
        
        if (deleteError) {
          console.warn('Error deleting reaction:', deleteError);
          // Try without reaction_type filter as fallback
          const { error: fallbackDeleteError } = await supabase
            .from('comment_reactions')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', userId);
          
          if (fallbackDeleteError) throw fallbackDeleteError;
        }
        return false; // unliked
      } else {
        // Add reaction
        const { error: insertError } = await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: userId,
            reaction_type: reactionType
          });
        
        if (insertError) {
          console.warn('Error inserting reaction:', insertError);
          // Try without reaction_type as fallback
          const { error: fallbackInsertError } = await supabase
            .from('comment_reactions')
            .insert({
              comment_id: commentId,
              user_id: userId
            });
          
          if (fallbackInsertError) throw fallbackInsertError;
        }
        return true; // liked
      }
    } catch (err) {
      console.error('Reaction operation failed:', err);
      throw err;
    }
  },

  async fetchReactions(commentIds: string[]) {
    if (commentIds.length === 0) return new Map<string, string[]>();
    
    try {
      const { data, error } = await supabase
        .from('comment_reactions')
        .select('comment_id, user_id, reaction_type')
        .in('comment_id', commentIds);

      if (error) {
        // Try fallback without reaction_type
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('comment_reactions')
          .select('comment_id, user_id')
          .in('comment_id', commentIds);
        
        if (fallbackError) throw fallbackError;
        
        const reactionMap = new Map<string, string[]>();
        (fallbackData || []).forEach((r: any) => {
          if (!reactionMap.has(r.comment_id)) {
            reactionMap.set(r.comment_id, []);
          }
          reactionMap.get(r.comment_id)!.push(r.user_id);
        });
        
        return reactionMap;
      }

      const reactionMap = new Map<string, string[]>();
      (data || []).forEach((r: any) => {
        if (!reactionMap.has(r.comment_id)) {
          reactionMap.set(r.comment_id, []);
        }
        reactionMap.get(r.comment_id)!.push(r.user_id);
      });

      return reactionMap;
    } catch (err) {
      console.error('Error fetching reactions:', err);
      return new Map<string, string[]>();
    }
  },

  async fetchProfiles(userIds: string[]) {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, is_verified')
      .in('user_id', uniqueIds);

    if (error) throw error;

    const profileMap = new Map();
    (data || []).forEach((p: any) => {
      profileMap.set(p.user_id, {
        id: p.user_id,
        name: p.display_name || 'User',
        avatarUrl: p.avatar_url || null,
        verified: p.is_verified || false
      });
    });

    return profileMap;
  },

  async fetchStickers() {
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .eq('is_active', true)
      .limit(50);
    
    if (error) throw error;
    return data || [];
  },

  async fetchGifts() {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    return data || [];
  }
};
