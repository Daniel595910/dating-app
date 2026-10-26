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
