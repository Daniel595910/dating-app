import { supabase } from '@/config/supabase.client';
import { DiscoverCandidate, PublishDetails, SwipeAction, SwipeResult } from '../types/discover.types';

class DiscoverService {
  async getCandidates(limit: number = 10, category: string = 'new', offset: number = 0): Promise<DiscoverCandidate[]> {
    const { data, error } = await supabase.rpc('get_discover_feed', {
      p_category: category,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Failed to get candidates:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      userId: c.user_id,
      videoId: c.video_id,
      displayName: c.display_name,
      avatarUrl: c.avatar_url,
      videoUrl: c.video_url,
      thumbnailUrl: c.thumbnail_url,
      bio: c.caption,
      age: c.age,
      city: c.location_city || null,
      state: c.location_state || null,
      relationshipIntent: c.relationship_intent,
      interests: c.interests || [],
      isVerified: c.is_verified || false,
      verificationBadge: c.verification_badge || 'none',
      distanceKm: 0,
      hashtags: c.hashtags || [],
      locationText: c.location_text || null,
      allowComments: c.allow_comments !== false,
      allowDuet: c.allow_duet !== false,
      likeCount: c.like_count || 0,
      userLiked: false,
      commentCount: c.comment_count || 0,
    }));
  }

  async swipe(targetId: string, action: SwipeAction): Promise<SwipeResult | null> {
    const { data, error } = await supabase.rpc('discover_swipe', {
      p_target_id: targetId,
      p_action: action,
    });

    if (error) {
      console.error('Swipe failed:', error);
      return null;
    }

    await supabase.rpc('record_swipe').then(() => {}).catch(() => {});

    return data as SwipeResult;
  }

  async submitVideo(
    videoUrl: string,
    caption?: string,
    thumbnailUrl?: string,
    details?: PublishDetails,
  ): Promise<boolean> {
    const { error } = await supabase.rpc('submit_discover_video', {
      p_video_url: videoUrl,
      p_caption: details ? details.caption : (caption || null),
      p_thumbnail_url: thumbnailUrl || null,
      p_metadata: {},
      p_hashtags: details ? details.hashtags : [],
      p_location_text: details ? details.locationText : null,
      p_allow_comments: details ? details.allowComments : true,
      p_allow_duet: details ? details.allowDuet : true,
        p_visibility: details ? details.visibility : 'public',
    });

    if (error) {
      console.error('Failed to submit video:', error);
      return false;
    }

    return true;
  }

  async likeVideo(videoId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from('discover_video_likes')
      .insert({ video_id: videoId, user_id: user.id });
    if (error) {
      // Duplicate insert (already liked) — treat as success
      if (error.code === '23505') return true;
      console.error('likeVideo failed:', error);
      return false;
    }
    return true;
  }

  async unlikeVideo(videoId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from('discover_video_likes')
      .delete()
      .eq('video_id', videoId)
      .eq('user_id', user.id);
    if (error) {
      console.error('unlikeVideo failed:', error);
      return false;
    }
    return true;
  }

  async getLikedVideoIds(videoIds: string[]): Promise<Set<string>> {
    if (videoIds.length === 0) return new Set();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Set();
    const { data, error } = await supabase
      .from('discover_video_likes')
      .select('video_id')
      .eq('user_id', user.id)
      .in('video_id', videoIds);
    if (error) {
      console.error('getLikedVideoIds failed:', error);
      return new Set();
    }
    return new Set((data || []).map((r: any) => r.video_id));
  }

  async searchHashtags(query: string, limit: number = 10): Promise<Array<{ hashtag: string; usageCount: number }>> {
    const { data, error } = await supabase.rpc('search_hashtags', {
      p_query: query,
      p_limit: limit,
    });
    if (error) {
      console.error('searchHashtags failed:', error);
      return [];
    }
    return (data || []).map((r: any) => ({ hashtag: r.hashtag, usageCount: r.usage_count || 0 }));
  }

  async fetchVideoComments(videoId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('discover_video_comments')
      .select('id, video_id, author_id, parent_id, root_id, content, content_type, media_url, status, created_at')
      .eq('video_id', videoId)
      .eq('status', 'published')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('fetchVideoComments failed:', error);
      return [];
    }
    const rows = data || [];
    if (rows.length === 0) return [];

    const authorIds = Array.from(new Set(rows.map((r: any) => r.author_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, is_verified')
      .in('user_id', authorIds);
    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));

    const commentIds = rows.map((r: any) => r.id);
    const { data: reactions } = await supabase
      .from('discover_video_comment_reactions')
      .select('comment_id, user_id')
      .in('comment_id', commentIds);
    const reactionMap = new Map<string, string[]>();
    (reactions || []).forEach((r: any) => {
      if (!reactionMap.has(r.comment_id)) reactionMap.set(r.comment_id, []);
      reactionMap.get(r.comment_id)!.push(r.user_id);
    });

    const { data: { user } } = await supabase.auth.getUser();
    const myId = user?.id || null;

    type Node = {
      id: string;
      videoId: string;
      authorId: string;
      parentId: string | null;
      rootId: string | null;
      content: string;
      contentType: string;
      mediaUrl: string | null;
      status: string;
      createdAt: string;
      authorName: string;
      authorAvatarUrl: string | null;
      authorVerified: boolean;
      reactionCount: number;
      userReacted: boolean;
      children: any[];
      replyCount: number;
      replyingToName: string | null;
    };

    const nodeMap = new Map<string, Node>();
    rows.forEach((r: any) => {
      const p = profileMap.get(r.author_id) || {};
      const users = reactionMap.get(r.id) || [];
      nodeMap.set(r.id, {
        id: r.id,
        videoId: r.video_id,
        authorId: r.author_id,
        parentId: r.parent_id,
        rootId: r.root_id,
        content: r.content,
        contentType: r.content_type,
        mediaUrl: r.media_url,
        status: r.status,
        createdAt: r.created_at,
        authorName: p.display_name || 'User',
        authorAvatarUrl: p.avatar_url || null,
        authorVerified: p.is_verified || false,
        reactionCount: users.length,
        userReacted: myId ? users.includes(myId) : false,
        children: [],
        replyCount: 0,
        replyingToName: null,
      });
    });

    rows.forEach((r: any) => {
      const node = nodeMap.get(r.id)!;
      if (r.parent_id && nodeMap.has(r.parent_id)) {
        node.replyingToName = nodeMap.get(r.parent_id)!.authorName;
      }
    });

    const roots: Node[] = [];
    rows.forEach((r: any) => {
      const node = nodeMap.get(r.id)!;
      if (r.parent_id && nodeMap.has(r.parent_id)) {
        nodeMap.get(r.parent_id)!.children.push(node);
        nodeMap.get(r.parent_id)!.replyCount++;
      } else if (!r.parent_id) {
        roots.push(node);
      }
    });

    return roots;
  }

  async addVideoComment(videoId: string, content: string, parentId: string | null = null, contentType: string = 'text', mediaUrl: string | null = null): Promise<any | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    let rootId: string | null = null;
    if (parentId) {
      const { data: parent } = await supabase
        .from('discover_video_comments')
        .select('root_id, id')
        .eq('id', parentId)
        .maybeSingle();
      rootId = parent?.root_id || parent?.id || parentId;
    }
    const { data, error } = await supabase
      .from('discover_video_comments')
      .insert({
        video_id: videoId,
        author_id: user.id,
        parent_id: parentId,
        root_id: rootId,
        content: content.trim(),
        content_type: contentType,
        media_url: mediaUrl,
        status: 'published',
      })
      .select()
      .single();
    if (error) {
      console.error('addVideoComment failed:', error);
      return null;
    }
    return data;
  }

  async deleteVideoComment(commentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('discover_video_comments')
      .delete()
      .eq('id', commentId);
    if (error) {
      console.error('deleteVideoComment failed:', error);
      return false;
    }
    return true;
  }
  async toggleCommentReaction(commentId: string): Promise<boolean | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: existing } = await supabase
      .from('discover_video_comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from('discover_video_comment_reactions')
        .delete()
        .eq('id', existing.id);
      return error ? null : false;
    } else {
      const { error } = await supabase
        .from('discover_video_comment_reactions')
        .insert({ comment_id: commentId, user_id: user.id, reaction_type: 'like' });
      return error ? null : true;
    }
  }

  async searchVideos(query: string = '', limit: number = 30, offset: number = 0): Promise<any[]> {
    const { data, error } = await supabase.rpc('search_discover_videos', {
      p_query: query,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error('searchVideos failed:', error);
      return [];
    }
    return data || [];
  }

  async getMyVideos(): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_my_discover_videos');

    if (error) {
      console.error('Failed to get my videos:', error);
      return [];
    }

    return data || [];
  }
}

export const discoverService = new DiscoverService();
