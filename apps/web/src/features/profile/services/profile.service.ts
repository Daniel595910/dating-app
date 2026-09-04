import { supabase } from '@/config/supabase.client';
import { ProfileData, ProfilePhoto, ProfileStats, UserPost } from '../types/profile.types';

class ProfileService {
  async getProfileByUserId(userId: string): Promise<ProfileData | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      displayName: data.display_name,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      coverPhotoUrl: data.cover_photo_url,
      gender: data.gender,
      age: data.age,
      location: data.location,
      interests: data.interests || [],
      relationshipIntent: data.relationship_intent,
      occupation: data.occupation,
      languages: data.languages || [],
      isVerified: data.is_verified,
      verificationBadge: data.verification_badge,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getProfilePhotos(userId: string): Promise<ProfilePhoto[]> {
    // Get profile record ID
    const { data: profileRecord } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileRecord) return [];

    const { data, error } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('profile_id', profileRecord.id)
      .order('order', { ascending: true });

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      url: p.url,
      thumbnailUrl: p.thumbnail_url,
      order: p.order,
      isPrimary: p.is_primary,
      createdAt: p.created_at,
    }));
  }

  async getUserPosts(userId: string): Promise<UserPost[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: p.id,
      type: p.type,
      content: p.content,
      images: p.images || [],
      likeCount: p.like_count || 0,
      commentCount: p.comment_count || 0,
      createdAt: p.created_at,
    }));
  }

  async getProfileStats(userId: string): Promise<ProfileStats> {
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    const { count: connectionsCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    return {
      posts: postsCount || 0,
      followers: followersCount || 0,
      following: followingCount || 0,
      connections: connectionsCount || 0,
    };
  }

  async updateProfile(userId: string, updates: Partial<ProfileData>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: updates.displayName,
        bio: updates.bio,
        gender: updates.gender,
        location: updates.location,
        interests: updates.interests,
        relationship_intent: updates.relationshipIntent,
        occupation: updates.occupation,
        languages: updates.languages,
      })
      .eq('user_id', userId);

    return !error;
  }

  async uploadProfilePhoto(userId: string, file: File): Promise<string | null> {
    // Get profile record ID
    const { data: profileRecord } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileRecord) return null;
    const profileId = profileRecord.id;

    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filePath = 'profile/' + userId + '/' + timestamp + '-' + randomSuffix + '.' + fileExtension;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file, { cacheControl: '3600' });

    if (uploadError) return null;

    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    await supabase.from('profile_photos').insert({
      profile_id: profileId,
      url: publicUrlData.publicUrl,
      thumbnail_url: publicUrlData.publicUrl,
      order: 0,
      is_primary: false,
    });

    const { count } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    if (count === 1) {
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('user_id', userId);
    }

    return publicUrlData.publicUrl;
  }

  async followUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase.from('follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });
    return !error;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    return !error;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();
    return Boolean(data);
  }
}

export const profileService = new ProfileService();
