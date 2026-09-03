/**
 * Profile Types
 * User profile information and related types
 */

import { Gender } from './user';

export type RelationshipIntent = |
  'serious_relationship' |
  'marriage' |
  'casual_dating' |
  'friendship' |
  'long_term' |
  'unsure';

export type EducationLevel = |
  'high_school' |
  'diploma' |
  'bachelors' |
  'masters' |
  'doctorate' |
  'other';

export type OccupationStatus = |
  'employed' |
  'self_employed' |
  'student' |
  'unemployed' |
  'retired' |
  'other';

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  bio ? : string | null;
  avatarUrl ? : string | null;
  coverPhotoUrl ? : string | null;
  gender ? : Gender | null;
  birthDate ? : string | null;
  age ? : number | null;
  location ? : LocationInfo | null;
  interests: string[];
  relationshipIntent ? : RelationshipIntent | null;
  educationLevel ? : EducationLevel | null;
  occupation ? : string | null;
  occupationStatus ? : OccupationStatus | null;
  heightCm ? : number | null;
  languages: string[];
  isVerified: boolean;
  verificationBadge ? : 'none' | 'basic' | 'premium' | 'vip';
  createdAt: string;
  updatedAt: string;
}

export interface LocationInfo {
  country: string;
  countryCode: string;
  state ? : string | null;
  city ? : string | null;
  coordinates ? : {
    latitude: number;
    longitude: number;
  } | null;
  timezone ? : string | null;
}

export interface ProfilePhoto {
  id: string;
  profileId: string;
  url: string;
  thumbnailUrl ? : string | null;
  order: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface CreateProfileInput {
  userId: string;
  displayName: string;
  bio ? : string;
  avatarUrl ? : string;
  coverPhotoUrl ? : string;
  gender ? : Gender;
  birthDate ? : string;
  location ? : LocationInfo;
  interests ? : string[];
  relationshipIntent ? : RelationshipIntent;
  educationLevel ? : EducationLevel;
  occupation ? : string;
  occupationStatus ? : OccupationStatus;
  heightCm ? : number;
  languages ? : string[];
}

export interface UpdateProfileInput {
  displayName ? : string;
  bio ? : string;
  avatarUrl ? : string;
  coverPhotoUrl ? : string;
  gender ? : Gender;
  birthDate ? : string;
  location ? : LocationInfo;
  interests ? : string[];
  relationshipIntent ? : RelationshipIntent;
  educationLevel ? : EducationLevel;
  occupation ? : string;
  occupationStatus ? : OccupationStatus;
  heightCm ? : number;
  languages ? : string[];
}

export interface ProfileFilters {
  gender ? : Gender[];
  ageRange ? : {
    min: number;
    max: number;
  };
  location ? : {
    country ? : string;
    state ? : string;
    city ? : string;
  };
  relationshipIntent ? : RelationshipIntent[];
  interests ? : string[];
  verifiedOnly ? : boolean;
}