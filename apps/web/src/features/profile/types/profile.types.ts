export interface ProfileData {
  id: string;
  userId: string;
  username: string;
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
  vipLevel: 'free' | 'basic' | 'premium' | 'vip';
  isProfessional: boolean;
  professionalSince: string | null;
  linkInBioUrl: string | null;
  professionalCategory: string | null;
  socialLinks: Record<string, string>;
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
  videos: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
}
