/**
 * User Types
 * Core user authentication and account types
 */

export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted' | 'pending_verification';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type Gender = 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say';

export interface User {
  id: string;
  email: string;
  phone ? : string | null;
  role: UserRole;
  status: UserStatus;
  verificationStatus: VerificationStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt ? : string | null;
  deletedAt ? : string | null;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
  deviceInfo ? : string | null;
  ipAddress ? : string | null;
}

export interface UserPreferences {
  userId: string;
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  profileVisibility: 'public' | 'community_only' | 'private';
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowMessagesFrom: 'everyone' | 'matches_only' | 'none';
  ageRangeMin: number;
  ageRangeMax: number;
  distanceRadius: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  password ? : string;
  phone ? : string;
  role ? : UserRole;
}

export interface UpdateUserInput {
  email ? : string;
  phone ? : string;
  role ? : UserRole;
  status ? : UserStatus;
  verificationStatus ? : VerificationStatus;
}