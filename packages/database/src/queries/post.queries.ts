/**
 * Post Database Queries
 * Type-safe database operations for posts and comments
 */

import { SupabaseService, handleDatabaseError } from '../supabase';
import type { Post, CreatePostInput, UpdatePostInput, PostFilters, Comment, CreateCommentInput } from '@dating-app/types';

export class PostQueries {
  private service: SupabaseService;
  
  constructor(service ? : SupabaseService) {
    this.service = service || SupabaseService.getInstance();
  }
  
  async getPostById(postId: string): Promise < Post | null > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (error) throw error;
      return data as Post | null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getPostsByCommunity(communityId: string, limit = 50, offset = 0): Promise < Post[] > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('posts')
        .select('*')
        .eq('community_id', communityId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return (data || []) as Post[];
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getPostsByAuthor(authorId: string, limit = 50): Promise < Post[] > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('posts')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as Post[];
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async createPost(input: CreatePostInput): Promise < Post > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('posts')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as Post;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async updatePost(postId: string, input: UpdatePostInput): Promise < Post > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('posts')
        .update({ ...input, is_edited: true, edited_at: new Date().toISOString() })
        .eq('id', postId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Post;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async deletePost(postId: string): Promise < void > {
    try {
      const { error } = await this.service
        .getClient()
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getCommentsByPost(postId: string, limit = 50): Promise < Comment[] > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'published')
        .order('created_at', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as Comment[];
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async createComment(input: CreateCommentInput): Promise < Comment > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('comments')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as Comment;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async deleteComment(commentId: string): Promise < void > {
    try {
      const { error } = await this.service
        .getClient()
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}