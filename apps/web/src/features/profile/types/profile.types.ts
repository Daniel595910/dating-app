export interface ProfileData {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  gender: string | null;
  age: number | null;
  location: {
    city?: string;
    state?: string;
    country?: string;
  } | null;
  interests: string[];
  relationshipIntent: string | null;
  occupation: string | null;
  languages: string[];
  isVerified: boolean;
  verificationBadge: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  order: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  connections: number;
}

export interface UserPost {
  id: string;
  type: string;
  content: string;
  images: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
}
