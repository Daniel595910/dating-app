/**
 * Profile Validation Schemas
 * Validation for user profiles
 */

import { z } from 'zod';
import { urlRegex, ValidationMessages } from './utils';

// Location schema
export const locationSchema = z.object({
  country: z.string().min(2, ValidationMessages.minLength(2)).max(100),
  countryCode: z.string().length(2, 'Country code must be 2 characters (ISO 3166-1 alpha-2)'),
  state: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
});

// Profile schema
export const profileSchema = z.object({
  id: z.string().uuid(ValidationMessages.uuid),
  userId: z.string().uuid(ValidationMessages.uuid),
  displayName: z.string().min(2, ValidationMessages.minLength(2)).max(100),
  bio: z.string().max(500, ValidationMessages.maxLength(500)).nullable().optional(),
  avatarUrl: z.string().regex(urlRegex, ValidationMessages.url).nullable().optional(),
  coverPhotoUrl: z.string().regex(urlRegex, ValidationMessages.url).nullable().optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).nullable().optional(),
  birthDate: z.string().datetime().nullable().optional(),
  age: z.number().int().min(18, 'Must be at least 18 years old').max(120).nullable().optional(),
  location: locationSchema.nullable().optional(),
  interests: z.array(z.string().min(1).max(50)).max(50).default([]),
  relationshipIntent: z.enum([
    'serious_relationship',
    'marriage',
    'casual_dating',
    'friendship',
    'long_term',
    'unsure',
  ]).nullable().optional(),
  educationLevel: z.enum([
    'high_school',
    'diploma',
    'bachelors',
    'masters',
    'doctorate',
    'other',
  ]).nullable().optional(),
  occupation: z.string().max(200).nullable().optional(),
  occupationStatus: z.enum([
    'employed',
    'self_employed',
    'student',
    'unemployed',
    'retired',
    'other',
  ]).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  languages: z.array(z.string().min(2).max(50)).max(20).default([]),
  isVerified: z.boolean().default(false),
  verificationBadge: z.enum(['none', 'basic', 'premium', 'vip']).default('none'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create profile schema
export const createProfileSchema = z.object({
  userId: z.string().uuid(ValidationMessages.uuid),
  displayName: z.string().min(2, ValidationMessages.minLength(2)).max(100),
  bio: z.string().max(500, ValidationMessages.maxLength(500)).optional(),
  avatarUrl: z.string().regex(urlRegex, ValidationMessages.url).optional(),
  coverPhotoUrl: z.string().regex(urlRegex, ValidationMessages.url).optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).optional(),
  birthDate: z.string().datetime().optional(),
  location: locationSchema.optional(),
  interests: z.array(z.string().min(1).max(50)).max(50).optional(),
  relationshipIntent: z.enum([
    'serious_relationship',
    'marriage',
    'casual_dating',
    'friendship',
    'long_term',
    'unsure',
  ]).optional(),
  educationLevel: z.enum([
    'high_school',
    'diploma',
    'bachelors',
    'masters',
    'doctorate',
    'other',
  ]).optional(),
  occupation: z.string().max(200).optional(),
  occupationStatus: z.enum([
    'employed',
    'self_employed',
    'student',
    'unemployed',
    'retired',
    'other',
  ]).optional(),
  heightCm: z.number().int().min(100).max(250).optional(),
  languages: z.array(z.string().min(2).max(50)).max(20).optional(),
});

// Update profile schema
export const updateProfileSchema = z.object({
  displayName: z.string().min(2, ValidationMessages.minLength(2)).max(100).optional(),
  bio: z.string().max(500, ValidationMessages.maxLength(500)).nullable().optional(),
  avatarUrl: z.string().regex(urlRegex, ValidationMessages.url).nullable().optional(),
  coverPhotoUrl: z.string().regex(urlRegex, ValidationMessages.url).nullable().optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).nullable().optional(),
  birthDate: z.string().datetime().nullable().optional(),
  location: locationSchema.nullable().optional(),
  interests: z.array(z.string().min(1).max(50)).max(50).optional(),
  relationshipIntent: z.enum([
    'serious_relationship',
    'marriage',
    'casual_dating',
    'friendship',
    'long_term',
    'unsure',
  ]).nullable().optional(),
  educationLevel: z.enum([
    'high_school',
    'diploma',
    'bachelors',
    'masters',
    'doctorate',
    'other',
  ]).nullable().optional(),
  occupation: z.string().max(200).nullable().optional(),
  occupationStatus: z.enum([
    'employed',
    'self_employed',
    'student',
    'unemployed',
    'retired',
    'other',
  ]).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  languages: z.array(z.string().min(2).max(50)).max(20).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Profile filters schema
export const profileFiltersSchema = z.object({
  gender: z.array(z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'])).optional(),
  ageRange: z.object({
    min: z.number().int().min(18).max(120),
    max: z.number().int().min(18).max(120),
  }).refine((data) => data.min <= data.max, {
    message: 'Minimum age must be less than or equal to maximum age',
  }).optional(),
  location: z.object({
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  relationshipIntent: z.array(z.enum([
    'serious_relationship',
    'marriage',
    'casual_dating',
    'friendship',
    'long_term',
    'unsure',
  ])).optional(),
  interests: z.array(z.string()).optional(),
  verifiedOnly: z.boolean().optional(),
});

// Export inferred types
export type ProfileSchema = z.infer < typeof profileSchema > ;
export type CreateProfileSchema = z.infer < typeof createProfileSchema > ;
export type UpdateProfileSchema = z.infer < typeof updateProfileSchema > ;
export type ProfileFiltersSchema = z.infer < typeof profileFiltersSchema > ;
export type LocationSchema = z.infer < typeof locationSchema > ;