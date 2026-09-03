import { supabase } from '@/config/supabase.client';
import {
  CommunityInfo,
  CommunityMember,
  CommunityPost,
  CommunityPostType,
  FeedCursor,
  FeedFilter,
  FeedResponse,
  PostMedia,
  PostStats,
  PostViewerState,
} from '../types/community.types';

class CommunityService {
  async getCommunityInfo(communityId: string): Promise<CommunityInfo | null> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      memberCount: data.member_count || 0,
      onlineCount: 0,
      country: data.country,
      countryCode: data.country_code,
      state: data.state,
      city: data.city,
      flag: this.getFlagEmoji(data.country_code),
    };
  }

  async getUserCommunityMembership(userId: string): Promise<CommunityMember | null> {
    const { data, error } = await supabase
      .from('community_members')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      communityId: data.community_id,
      userId: data.user_id,
      role: data.role,
      joinedAt: data.joined_at,
    };
  }

  async getUserFollowingIds(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    return (data || []).map((f: any) => f.following_id);
  }

  async getFeedPosts(
    communityId: string,
    userId: string,
    filter: FeedFilter = 'all',
    cursor?: FeedCursor | null,
    limit: number = 20
  ): Promise<FeedResponse> {
    console.log('=== getFeedPosts called ===');
    console.log('communityId:', communityId);
    console.log('userId:', userId);
    console.log('filter:', filter);

    let query = supabase
      .from('posts')
      .select('*')
      .eq('community_id', communityId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    // Apply filter logic
    if (filter === 'looking') {
      console.log('Filtering by looking_for type');
      query = query.eq('type', 'looking_for');
    } else if (filter === 'new') {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      console.log('Filtering by new (last 24h):', last24h);
      query = query.gte('created_at', last24h);
    } else if (filter === 'following') {
      console.log('Filtering by following users');
      const followingIds = await this.getUserFollowingIds(userId);
      console.log('Following IDs:', followingIds);
      if (followingIds.length > 0) {
        query = query.in('author_id', followingIds);
      } else {
        console.log('No following, returning empty');
        return { posts: [], nextCursor: null, hasMore: false };
      }
    } else if (filter === 'nearby') {
      console.log('Filtering by nearby users');
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('location')
        .eq('user_id', userId)
        .single();

      console.log('Current user location:', userProfile?.location);

      if (userProfile?.location?.city) {
        const { data: nearbyProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .filter('location->>city', 'eq', userProfile.location.city);

        const nearbyUserIds = (nearbyProfiles || []).map((p: any) => p.user_id);
        console.log('Nearby user IDs:', nearbyUserIds);

        if (nearbyUserIds.length > 0) {
          query = query.in('author_id', nearbyUserIds);
        } else {
          console.log('No nearby users, returning empty');
          return { posts: [], nextCursor: null, hasMore: false };
        }
      } else {
        console.log('No location set, returning empty');
        return { posts: [], nextCursor: null, hasMore: false };
      }
    }

    // Apply cursor for pagination
    if (cursor) {
      query = query.lt('created_at', cursor.createdAt);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Failed to fetch posts:', error);
      return { posts: [], nextCursor: null, hasMore: false };
    }

    console.log('Posts fetched:', posts?.length || 0);

    if (!posts || posts.length === 0) {
      return { posts: [], nextCursor: null, hasMore: false };
    }

    const hasMore = posts.length > limit;
    const feedPosts = hasMore ? posts.slice(0, limit) : posts;

    // Get author profiles
    const authorIds = [...new Set(feedPosts.map((p: any) => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', authorIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    // Get user's reactions
    const postIds = feedPosts.map((p: any) => p.id);
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);

    const likedPostIds = new Set((reactions || []).map((r: any) => r.post_id));

    const communityPosts: CommunityPost[] = feedPosts.map((post: any) => {
      const profile = profileMap.get(post.author_id);
      return this.mapPostToCommunityPost(post, profile, likedPostIds.has(post.id));
    });

    const lastPost = feedPosts[feedPosts.length - 1];
    const nextCursor: FeedCursor | null = hasMore
      ? { createdAt: lastPost.created_at, id: lastPost.id }
      : null;

    console.log('Returning posts:', communityPosts.length, 'hasMore:', hasMore);

    return { posts: communityPosts, nextCursor, hasMore };
  }

  async likePost(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('post_reactions')
      .upsert(
        { post_id: postId, user_id: userId, reaction_type: 'like' },
        { onConflict: 'post_id,user_id' }
      );

    return !error;
  }

  async unlikePost(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    return !error;
  }

  async createPost(
    communityId: string,
    authorId: string,
    type: CommunityPostType,
    content: string,
    lookingFor?: string,
    media?: PostMedia[],
    tags?: string[]
  ): Promise<CommunityPost | null> {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        community_id: communityId,
        author_id: authorId,
        type,
        content,
        status: 'published',
        images: media?.map((m) => m.url) || [],
        tags: tags || [],
      })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      communityId: data.community_id,
      author: { id: authorId, name: 'You', avatarUrl: null, verified: false },
      type: data.type,
      content: data.content,
      media: media || [],
      lookingFor: lookingFor ? { type: 'relationship', label: lookingFor } : undefined,
      tags: data.tags || [],
      stats: { likes: 0, comments: 0, shares: 0 },
      viewer: { liked: false, followingAuthor: false, connectionStatus: 'none' },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  subscribeToPresence(
    communityId: string,
    userId: string,
    onPresenceChange: (onlineCount: number) => void
  ): () => void {
    const channel = supabase.channel(`presence:${communityId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineCount = Object.keys(state).length;
        onPresenceChange(onlineCount);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }

  private mapPostToCommunityPost(post: any, profile: any, liked: boolean): CommunityPost {
    return {
      id: post.id,
      communityId: post.community_id,
      author: {
        id: post.author_id,
        name: profile?.display_name || 'User',
        avatarUrl: profile?.avatar_url || null,
        verified: profile?.is_verified || false,
        age: profile?.age || undefined,
        location: profile?.location?.city || profile?.location?.state || undefined,
      },
      type: post.type,
      content: post.content,
      media: (post.images || []).map((url: string, index: number) => ({
        id: `${post.id}-media-${index}`,
        type: 'image' as const,
        url,
        sortOrder: index,
      })),
      lookingFor: post.type === 'looking_for' ? this.parseLookingFor(post.content) : undefined,
      tags: post.tags || [],
      stats: {
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        shares: 0,
      },
      viewer: { liked, followingAuthor: false, connectionStatus: 'none' },
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    };
  }

  private parseLookingFor(content: string) {
    const match = content.match(/Looking for:\s*(.+)/);
    const label = match ? match[1] : 'Connection';
    return { type: 'relationship' as const, label };
  }

  private getFlagEmoji(countryCode: string): string {
    const flags: Record<string, string> = {
      NG: '🇳🇬', GH: '🇬🇭', ZA: '🇿🇦', GB: '🇬🇧', US: '🇺🇸',
    };
    return flags[countryCode] || '🌍';
  }
}

export const communityService = new CommunityService();
