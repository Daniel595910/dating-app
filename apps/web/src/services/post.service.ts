/**
 * Post Service
 * Handles post and comment operations
 */

import { supabase } from '@/config/supabase.client';
import { Post, Comment, CreatePostInput, CreateCommentInput } from '@dating-app/types';

class PostService {
  async getPostsByCommunity(
    communityId: string,
    limit = 20,
    offset = 0
  ): Promise < Post[] > {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('community_id', communityId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return (data || []) as Post[];
    } catch {
      return [];
    }
  }
  
  async getPostById(postId: string): Promise < Post | null > {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (error) throw error;
      return data as Post;
    } catch {
      return null;
    }
  }
  
  async createPost(input: CreatePostInput): Promise < Post | null > {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as Post;
    } catch {
      return null;
    }
  }
  
  async updatePost(postId: string, updates: Partial < Post > ): Promise < Post | null > {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ ...updates, is_edited: true, edited_at: new Date().toISOString() })
        .eq('id', postId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Post;
    } catch {
      return null;
    }
  }
  
  async deletePost(postId: string): Promise < boolean > {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
  
  async likePost(postId: string, userId: string): Promise < boolean > {
    try {
      const { error } = await supabase.from('post_reactions').insert({
        post_id: postId,
        user_id: userId,
        reaction_type: 'like',
      });
      
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
  
  async unlikePost(postId: string, userId: string): Promise < boolean > {
    try {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
  
  async getCommentsByPost(postId: string, limit = 50): Promise < Comment[] > {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'published')
        .order('created_at', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as Comment[];
    } catch {
      return [];
    }
  }
  
  async createComment(input: CreateCommentInput): Promise < Comment | null > {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as Comment;
    } catch {
      return null;
    }
  }
  
  async deleteComment(commentId: string): Promise < boolean > {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
  
  subscribeToNewPosts(
    communityId: string,
    callback: (post: Post) => void
  ): () => void {
    const subscription = supabase
      .channel(`community-posts-${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          callback(payload.new as Post);
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }
}

export const postService = new PostService();