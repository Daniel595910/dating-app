/**
 * User Validation Schemas
 * Validation for user registration, login, and updates
 */

import { z } from 'zod';
import { emailRegex, phoneRegex, ValidationMessages } from './utils';

// Base user schema
export const userSchema = z.object({
  id: z.string().uuid(ValidationMessages.uuid),
  email: z.string().email(ValidationMessages.email),
  phone: z.string().regex(phoneRegex, ValidationMessages.phone).nullable().optional(),
  role: z.enum(['user', 'moderator', 'admin', 'super_admin']).default('user'),
  status: z.enum(['active', 'suspended', 'banned', 'deleted', 'pending_verification']).default('pending_verification'),
  verificationStatus: z.enum(['unverified', 'pending', 'verified', 'rejected']).default('unverified'),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
});

// Registration schema
export const registerUserSchema = z.object({
  email: z.string().email(ValidationMessages.email),
  password: z.string()
    .min(8, ValidationMessages.minLength(8))
    .max(128, ValidationMessages.maxLength(128))
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
  phone: z.string().regex(phoneRegex, ValidationMessages.phone).optional(),
  acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
  acceptPrivacy: z.boolean().refine((val) => val === true, 'You must accept the privacy policy'),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(ValidationMessages.email),
  password: z.string().min(1, ValidationMessages.required),
  rememberMe: z.boolean().optional().default(false),
});

// Phone verification schema
export const phoneVerificationSchema = z.object({
  phone: z.string().regex(phoneRegex, ValidationMessages.phone),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

// Email verification schema
export const emailVerificationSchema = z.object({
  email: z.string().email(ValidationMessages.email),
  token: z.string().min(1, ValidationMessages.required),
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z.string().email(ValidationMessages.email),
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string().min(1, ValidationMessages.required),
  newPassword: z.string()
    .min(8, ValidationMessages.minLength(8))
    .max(128, ValidationMessages.maxLength(128))
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
});

// Update user schema
export const updateUserSchema = z.object({
  email: z.string().email(ValidationMessages.email).optional(),
  phone: z.string().regex(phoneRegex, ValidationMessages.phone).nullable().optional(),
  role: z.enum(['user', 'moderator', 'admin', 'super_admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned', 'deleted', 'pending_verification']).optional(),
  verificationStatus: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// User preferences schema
export const userPreferencesSchema = z.object({
  language: z.string().min(2).max(10).default('en'),
  timezone: z.string().min(1).max(100),
  notificationsEnabled: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

// User settings schema
export const userSettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'community_only', 'private']).default('community_only'),
  showOnlineStatus: z.boolean().default(true),
  showLastSeen: z.boolean().default(true),
  allowMessagesFrom: z.enum(['everyone', 'matches_only', 'none']).default('matches_only'),
  ageRangeMin: z.number().int().min(18).max(100).default(18),
  ageRangeMax: z.number().int().min(18).max(100).default(100),
  distanceRadius: z.number().int().min(1).max(1000).default(100),
}).refine((data) => data.ageRangeMin <= data.ageRangeMax, {
  message: 'Minimum age must be less than or equal to maximum age',
  path: ['ageRangeMin'],
});

// Export inferred types
export type UserSchema = z.infer < typeof userSchema > ;
export type RegisterUserSchema = z.infer < typeof registerUserSchema > ;
export type LoginSchema = z.infer < typeof loginSchema > ;
export type PhoneVerificationSchema = z.infer < typeof phoneVerificationSchema > ;
export type EmailVerificationSchema = z.infer < typeof emailVerificationSchema > ;
export type PasswordResetRequestSchema = z.infer < typeof passwordResetRequestSchema > ;
export type PasswordResetSchema = z.infer < typeof passwordResetSchema > ;
export type UpdateUserSchema = z.infer < typeof updateUserSchema > ;
export type UserPreferencesSchema = z.infer < typeof userPreferencesSchema > ;
export type UserSettingsSchema = z.infer < typeof userSettingsSchema > ;