export type CommunityPostType = 'introduction' | 'looking_for' | 'discussion' | 'question' | 'photo';

export type ConnectionStatus = 'none' | 'requested' | 'accepted' | 'getting_to_know' | 'mutual_interest' | 'matched';

export interface CommunityPostAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  age?: number;
  location?: string;
}

export interface PostMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  sortOrder: number;
}

export interface LookingForData {
  type: 'relationship' | 'marriage' | 'friendship' | 'casual' | 'conversation';
  label: string;
}

export interface PostStats {
  likes: number;
  comments: number;
  shares: number;
}

export interface PostViewerState {
  liked: boolean;
  followingAuthor: boolean;
  connectionStatus: ConnectionStatus;
}

export interface CommunityPost {
  metadata?: {
    audioUrl?: string;
    durationMs?: number;
  } | null;
  id: string;
  communityId: string;
  author: CommunityPostAuthor;
  type: CommunityPostType;
  content: string;
  media: PostMedia[];
  lookingFor?: LookingForData;
  tags: string[];
  stats: PostStats;
  viewer: PostViewerState;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  memberCount: number;
  onlineCount: number;
  country: string;
  countryCode: string;
  state?: string;
  city?: string;
  flag: string;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: string;
}

export interface FeedCursor {
  createdAt: string;
  id: string;
}

export interface FeedResponse {
  posts: CommunityPost[];
  nextCursor: FeedCursor | null;
  hasMore: boolean;
}

export type FeedFilter = 'all' | 'new' | 'looking' | 'nearby' | 'following';

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  root_id: string | null;
  content: string;
  content_type: 'text' | 'emoji' | 'gif' | 'sticker' | 'gift';
  media_url: string | null;
  media_id: string | null;
  metadata: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
  author?: CommunityPostAuthor;
}

export interface CommentNodeData extends Comment {
  children: CommentNodeData[];
  reactionCount: number;
  userReacted: boolean;
  isOwn: boolean;
  replyCount: number;
  depth: number;
}

export interface ConnectionRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

export interface ConnectionState {
  connectionId: string | null;
  status: ConnectionStatus;
  progress: number;
  stages: ConnectionStage[];
}

export interface ConnectionStage {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}
