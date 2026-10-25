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
