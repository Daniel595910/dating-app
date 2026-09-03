/**
 * Community Types
 * Regional dating communities and related types
 */

export type CommunityType = 'country' | 'state' | 'city' | 'region';

export type CommunityStatus = 'active' | 'inactive' | 'archived' | 'locked';

export interface Community {
  id: string;
  name: string;
  slug: string;
  type: CommunityType;
  status: CommunityStatus;
  description ? : string | null;
  country: string;
  countryCode: string;
  state ? : string | null;
  city ? : string | null;
  parentId ? : string | null;
  memberCount: number;
  postCount: number;
  moderators: string[];
  rules ? : string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: string;
  isMuted: boolean;
  mutedUntil ? : string | null;
  isBanned: boolean;
  bannedReason ? : string | null;
}

export interface CommunityStats {
  communityId: string;
  totalMembers: number;
  onlineMembers: number;
  totalPosts: number;
  postsToday: number;
  totalMatches: number;
  matchesToday: number;
  activeConversations: number;
}

export interface CreateCommunityInput {
  name: string;
  slug: string;
  type: CommunityType;
  description ? : string;
  country: string;
  countryCode: string;
  state ? : string;
  city ? : string;
  parentId ? : string;
  rules ? : string[];
}

export interface UpdateCommunityInput {
  name ? : string;
  description ? : string;
  status ? : CommunityStatus;
  rules ? : string[];
  moderators ? : string[];
}