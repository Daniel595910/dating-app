export interface DiscoverCandidate {
  userId: string;
  videoId: string;
  displayName: string;
  avatarUrl: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  bio: string | null;
  age: number | null;
  city: string | null;
  state: string | null;
  relationshipIntent: string | null;
  interests: string[];
  isVerified: boolean;
  verificationBadge: string;
  distanceKm: number;
  hashtags: string[];
  locationText: string | null;
  allowComments: boolean;
  allowDuet: boolean;
  likeCount: number;
  userLiked: boolean;
}

export type Visibility = 'public' | 'friends' | 'private';

export interface PublishDetails {
  caption: string;
  hashtags: string[];
  visibility: Visibility;
  locationText: string | null;
  allowComments: boolean;
  allowDuet: boolean;
  likeCount: number;
  userLiked: boolean;
}

export type SwipeAction = 'like' | 'pass' | 'get_to_know';

export interface SwipeResult {
  matched: boolean;
  matchId: string | null;
}
