import { supabase } from '@/config/supabase.client';
import { DiscoverCandidate, SwipeAction, SwipeResult } from '../types/discover.types';

class DiscoverService {
  async getCandidates(limit: number = 10, category: string = 'new'): Promise<DiscoverCandidate[]> {
    const { data, error } = await supabase.rpc('get_discover_feed', {
      p_category: category,
      p_limit: limit,
    });

    if (error) {
      console.error('Failed to get candidates:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      userId: c.user_id,
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

    // Record swipe for daily limit
    await supabase.rpc('record_swipe');

    return data as SwipeResult;
  }

  async checkDailyLimit(): Promise<{ allowed: boolean; remaining: number }> {
    const { data } = await supabase.rpc('check_daily_swipe_limit');
    if (data) {
      return {
        allowed: data.allowed,
        remaining: data.remaining,
      };
    }
    return { allowed: true, remaining: 50 };
  }

  async submitVideo(videoUrl: string, caption?: string, thumbnailUrl?: string): Promise<boolean> {
    const { error } = await supabase.rpc('submit_discover_video', {
      p_video_url: videoUrl,
      p_caption: caption || null,
      p_thumbnail_url: thumbnailUrl || null,
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
