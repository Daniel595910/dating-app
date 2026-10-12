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
}

export type SwipeAction = 'like' | 'pass' | 'get_to_know';

export interface SwipeResult {
  matched: boolean;
  matchId: string | null;
}
