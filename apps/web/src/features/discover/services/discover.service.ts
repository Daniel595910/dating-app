import { supabase } from '@/config/supabase.client';
import { DiscoverCandidate, SwipeAction, SwipeResult } from '../types/discover.types';

class DiscoverService {
  async getCandidates(userId: string, limit: number = 10): Promise<DiscoverCandidate[]> {
    const { data, error } = await supabase.rpc('get_discover_candidates', {
      p_user_id: userId,
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
      bio: c.bio,
      age: c.age,
      city: c.location_city,
      state: c.location_state,
      relationshipIntent: c.relationship_intent,
      interests: c.interests || [],
      isVerified: c.is_verified,
      verificationBadge: c.verification_badge,
      distanceKm: c.distance_km || 0,
    }));
  }

  async swipe(userId: string, targetId: string, action: SwipeAction): Promise<SwipeResult | null> {
    const { data, error } = await supabase.rpc('discover_swipe', {
      p_target_id: targetId,
      p_action: action,
    });

    if (error) {
      console.error('Swipe failed:', error);
      return null;
    }

    return data as SwipeResult;
  }

  async uploadVideoProfile(userId: string, videoBlob: Blob, thumbnailBlob?: Blob): Promise<string | null> {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const videoPath = 'video-profile/' + userId + '/' + timestamp + '-' + randomSuffix + '.webm';

    const { error: videoUploadError } = await supabase.storage
      .from('media')
      .upload(videoPath, videoBlob, { cacheControl: '3600', contentType: 'video/webm' });

    if (videoUploadError) return null;

    const { data: videoUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(videoPath);

    let thumbnailUrl = null;
    if (thumbnailBlob) {
      const thumbPath = 'video-profile/' + userId + '/' + timestamp + '-thumb.jpg';
      const { error: thumbError } = await supabase.storage
        .from('media')
        .upload(thumbPath, thumbnailBlob, { cacheControl: '3600', contentType: 'image/jpeg' });

      if (!thumbError) {
        const { data: thumbUrlData } = supabase.storage
          .from('media')
          .getPublicUrl(thumbPath);
        thumbnailUrl = thumbUrlData.publicUrl;
      }
    }

    // Save video profile
    await supabase.from('video_profiles').upsert({
      user_id: userId,
      video_url: videoUrlData.publicUrl,
      thumbnail_url: thumbnailUrl,
      status: 'pending',
    });

    return videoUrlData.publicUrl;
  }

  async getMyVideoProfile(userId: string): Promise<{ videoUrl: string; status: string } | null> {
    const { data } = await supabase
      .from('video_profiles')
      .select('video_url, status')
      .eq('user_id', userId)
      .maybeSingle();

    return data || null;
  }

  async deleteVideoProfile(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('video_profiles')
      .delete()
      .eq('user_id', userId);

    return !error;
  }
}

export const discoverService = new DiscoverService();
