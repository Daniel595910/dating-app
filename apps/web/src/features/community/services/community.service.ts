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

  async getAllUserCommunities(userId: string): Promise<CommunityMember[]> {
    const { data, error } = await supabase
      .from('community_members')
      .select('*')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      communityId: m.community_id,
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
    }));
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
    // Nearby filter uses an RPC for distance-based queries
    if (filter === 'nearby') {
      return this.getNearbyPosts(communityId, userId, cursor, limit);
    }

    let query = supabase
      .from('posts')
      .select('*')
      .eq('community_id', communityId)
      .neq('type', 'profile_share')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (filter === 'looking') {
      query = query.eq('type', 'looking_for');
    } else if (filter === 'new') {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', last24h);
    } else if (filter === 'following') {
      const followingIds = await this.getUserFollowingIds(userId);
      if (followingIds.length === 0) {
        return { posts: [], nextCursor: null, hasMore: false };
      }
      query = query.in('author_id', followingIds);
    }

    if (cursor) {
      query = query.lt('created_at', cursor.createdAt);
    }

    const { data: posts, error } = await query;

    if (error || !posts || posts.length === 0) {
      return { posts: [], nextCursor: null, hasMore: false };
    }

    const hasMore = posts.length > limit;
    const feedPosts = hasMore ? posts.slice(0, limit) : posts;

    const authorIds = [...new Set(feedPosts.map((p: any) => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', authorIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

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

    return { posts: communityPosts, nextCursor, hasMore };
  }

  private async getNearbyPosts(
    communityId: string,
    userId: string,
    cursor: FeedCursor | null | undefined,
    limit: number
  ): Promise<FeedResponse> {
    const { data: nearbyPosts, error } = await supabase.rpc('get_nearby_posts', {
      p_user_id: userId,
      p_community_id: communityId,
      p_radius_km: 50,
      p_cursor: cursor?.createdAt || null,
      p_limit: limit + 1,
    });

    if (error || !nearbyPosts || nearbyPosts.length === 0) {
      return { posts: [], nextCursor: null, hasMore: false };
    }

    const hasMore = nearbyPosts.length > limit;
    const feedPosts = hasMore ? nearbyPosts.slice(0, limit) : nearbyPosts;

    const authorIds = [...new Set(feedPosts.map((p: any) => p.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', authorIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const communityPosts: CommunityPost[] = feedPosts.map((post: any) => {
      const profile = profileMap.get(post.author_id);
      return this.mapPostToCommunityPost(post, profile, false);
    });

    const lastPost = feedPosts[feedPosts.length - 1];
    const nextCursor: FeedCursor | null = hasMore
      ? { createdAt: lastPost.created_at, id: lastPost.id }
      : null;

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

  async getCommunityById(communityId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async updateCommunity(
    communityId: string,
    updates: {
      name?: string;
      description?: string | null;
      rules?: string[];
      coverImageUrl?: string | null;
      country?: string;
      countryCode?: string;
      state?: string | null;
      city?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };

    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.rules !== undefined) patch.rules = updates.rules;
    if (updates.coverImageUrl !== undefined) patch.cover_image_url = updates.coverImageUrl;
    if (updates.country !== undefined) patch.country = updates.country;
    if (updates.countryCode !== undefined) patch.country_code = updates.countryCode;
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.city !== undefined) patch.city = updates.city;

    const { error } = await supabase
      .from('communities')
      .update(patch)
      .eq('id', communityId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  async archiveCommunity(communityId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('communities')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', communityId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async unarchiveCommunity(communityId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('communities')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', communityId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async deleteCommunity(communityId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('communities')
      .delete()
      .eq('id', communityId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async createInvite(
    communityId: string,
    userId: string,
    options: { expiresInDays?: number; maxUses?: number | null } = {}
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '').slice(0, 24);
    const expiresAt = options.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('community_invites')
      .insert({
        community_id: communityId,
        token,
        created_by: userId,
        expires_at: expiresAt,
        max_uses: options.maxUses ?? null,
      })
      .select('token')
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Insert failed' };
    return { success: true, token: data.token };
  }

  async listInvites(communityId: string): Promise<Array<{
    id: string;
    token: string;
    expiresAt: string | null;
    maxUses: number | null;
    useCount: number;
    createdAt: string;
  }>> {
    const { data, error } = await supabase
      .from('community_invites')
      .select('id, token, expires_at, max_uses, use_count, created_at')
      .eq('community_id', communityId)
      .eq('is_revoked', false)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      token: r.token,
      expiresAt: r.expires_at,
      maxUses: r.max_uses,
      useCount: r.use_count,
      createdAt: r.created_at,
    }));
  }

  async revokeInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('community_invites')
      .update({ is_revoked: true })
      .eq('id', inviteId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  async updateMemberRole(
    communityId: string,
    userId: string,
    role: 'member' | 'moderator' | 'admin'
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('community_members')
      .update({ role })
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async removeMember(
    communityId: string,
    userId: string,
    removedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('community_members')
      .update({ status: 'removed', removed_at: new Date().toISOString(), removed_by: removedBy })
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async approveMember(
    communityId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('community_members')
      .update({ status: 'active' })
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async rejectMember(
    communityId: string,
    userId: string,
    removedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('community_members')
      .update({ status: 'removed', removed_at: new Date().toISOString(), removed_by: removedBy })
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async listCommunityMembers(communityId: string): Promise<Array<{
    id: string;
    userId: string;
    role: string;
    status: string;
    isBanned: boolean;
    joinedAt: string;
  }>> {
    const { data, error } = await supabase
      .from('community_members')
      .select('id, user_id, role, status, is_banned, joined_at')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false });

    if (error || !data) return [];
    return data.map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      role: m.role || 'member',
      status: m.status || 'active',
      isBanned: m.is_banned || false,
      joinedAt: m.joined_at,
    }));
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
      metadata: post.metadata || null,
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

  private parseLookingFor(content: string): { type: 'relationship'; label: string } {
    const match = content.match(/Looking for:\s*(.+)/);
    const label = match?.[1] ?? 'Connection';
    return { type: 'relationship', label };
  }

  private getFlagEmoji(countryCode: string): string {
    const flags: Record<string, string> = {
      NG: '🇳🇬', GH: '🇬🇭', ZA: '🇿🇦', GB: '🇬🇧', US: '🇺🇸',
    };
    return flags[countryCode] || '🌍';
  }
}

export const communityService = new CommunityService();
