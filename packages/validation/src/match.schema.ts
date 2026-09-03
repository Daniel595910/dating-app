/**
 * Match Validation Schemas
 * Validation for matching system
 */

import { z } from 'zod';
import { ValidationMessages } from './utils';

// Compatibility answers schema
export const compatibilityAnswersSchema = z.object({
  relationshipGoals: z.array(z.string().min(1).max(200)).max(10),
  familyPlans: z.array(z.string().min(1).max(200)).max(10),
  lifestyle: z.array(z.string().min(1).max(200)).max(10),
  values: z.array(z.string().min(1).max(200)).max(10),
  communicationStyle: z.array(z.string().min(1).max(200)).max(10),
  dealBreakers: z.array(z.string().min(1).max(200)).max(10),
});

// Match schema
export const matchSchema = z.object({
  id: z.string().uuid(ValidationMessages.uuid),
  user1Id: z.string().uuid(ValidationMessages.uuid),
  user2Id: z.string().uuid(ValidationMessages.uuid),
  stage: z.enum(['getting_to_know', 'compatibility_check', 'matched', 'rejected', 'expired']).default('getting_to_know'),
  status: z.enum(['active', 'completed', 'cancelled', 'expired']).default('active'),
  matchScore: z.number().min(0).max(100).nullable().optional(),
  compatibilityAnswers: compatibilityAnswersSchema.nullable().optional(),
  matchedAt: z.string().datetime().nullable().optional(),
  rejectedAt: z.string().datetime().nullable().optional(),
  expiredAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create match schema
export const createMatchSchema = z.object({
  user1Id: z.string().uuid(ValidationMessages.uuid),
  user2Id: z.string().uuid(ValidationMessages.uuid),
}).refine((data) => data.user1Id !== data.user2Id, {
  message: 'Users must be different',
});

// Update match schema
export const updateMatchSchema = z.object({
  stage: z.enum(['getting_to_know', 'compatibility_check', 'matched', 'rejected', 'expired']).optional(),
  status: z.enum(['active', 'completed', 'cancelled', 'expired']).optional(),
  matchScore: z.number().min(0).max(100).nullable().optional(),
  compatibilityAnswers: compatibilityAnswersSchema.nullable().optional(),
  matchedAt: z.string().datetime().nullable().optional(),
  rejectedAt: z.string().datetime().nullable().optional(),
  expiredAt: z.string().datetime().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Match request schema
export const matchRequestSchema = z.object({
  id: z.string().uuid(ValidationMessages.uuid),
  requesterId: z.string().uuid(ValidationMessages.uuid),
  targetId: z.string().uuid(ValidationMessages.uuid),
  message: z.string().max(500).nullable().optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']).default('pending'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create match request schema
export const createMatchRequestSchema = z.object({
  requesterId: z.string().uuid(ValidationMessages.uuid),
  targetId: z.string().uuid(ValidationMessages.uuid),
  message: z.string().max(500).optional(),
}).refine((data) => data.requesterId !== data.targetId, {
  message: 'Users must be different',
});

// Update match request schema
export const updateMatchRequestSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']),
});

// Match preferences schema
export const matchPreferencesSchema = z.object({
  userId: z.string().uuid(ValidationMessages.uuid),
  ageRange: z.object({
    min: z.number().int().min(18).max(120),
    max: z.number().int().min(18).max(120),
  }).refine((data) => data.min <= data.max, {
    message: 'Minimum age must be less than or equal to maximum age',
  }),
  distanceRadius: z.number().int().min(1).max(1000),
  relationshipIntent: z.array(z.enum([
    'serious_relationship',
    'marriage',
    'casual_dating',
    'friendship',
    'long_term',
    'unsure',
  ])).max(10),
  dealBreakers: z.array(z.string().min(1).max(200)).max(20),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Export inferred types
export type MatchSchema = z.infer < typeof matchSchema > ;
export type CreateMatchSchema = z.infer < typeof createMatchSchema > ;
export type UpdateMatchSchema = z.infer < typeof updateMatchSchema > ;
export type MatchRequestSchema = z.infer < typeof matchRequestSchema > ;
export type CreateMatchRequestSchema = z.infer < typeof createMatchRequestSchema > ;
export type UpdateMatchRequestSchema = z.infer < typeof updateMatchRequestSchema > ;
export type MatchPreferencesSchema = z.infer < typeof matchPreferencesSchema > ;
export type CompatibilityAnswersSchema = z.infer < typeof compatibilityAnswersSchema > ;