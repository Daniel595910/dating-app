/**
 * Post Validation Schemas
 * Validation for community posts
 */

import { z } from 'zod';
import { ValidationMessages } from './utils';

// Post schema
export const postSchema = z.object({
  id: z.string().uuid(ValidationMessages.uuid),
  communityId: z.string().uuid(ValidationMessages.uuid),
  authorId: z.string().uuid(ValidationMessages.uuid),
  type: z.enum(['introduction', 'looking_for', 'discussion', 'question', 'event', 'other']),
  content: z.string().min(1, ValidationMessages.required).max(5000, ValidationMessages.maxLength(5000)),
  status: z.enum(['published', 'hidden', 'flagged', 'deleted', 'pending_review']).default('published'),
  images: z.array(z.string().url()).max(10).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).nullable().optional(),
  likeCount: z.number().int().nonNegative().default(0),
  commentCount: z.number().int().nonNegative().default(0),
  reportCount: z.number().int().nonNegative().default(0),
  isEdited: z.boolean().default(false),
  editedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create post schema
export const createPostSchema = z.object({
  communityId: z.string().uuid(ValidationMessages.uuid),
  authorId: z.string().uuid(ValidationMessages.uuid),
  type: z.enum(['introduction', 'looking_for', 'discussion', 'question', 'event', 'other']).default('discussion'),
  content: z.string().min(1, ValidationMessages.required).max(5000, ValidationMessages.maxLength(5000)),
  images: z.array(z.string().url()).max(10).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

// Update post schema
export const updatePostSchema = z.object({
  content: z.string().min(1, ValidationMessages.required).max(5000, ValidationMessages.maxLength(5000)).optional(),
  type: z.enum(['introduction', 'looking_for', 'discussion', 'question', 'event', 'other']).optional(),
  images: z.array(z.string().url()).max(10).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).nullable().optional(),
  status: z.enum(['published', 'hidden', 'flagged', 'deleted', 'pending_review']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Post filters schema
export const postFiltersSchema = z.object({
  communityId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  type: z.array(z.enum(['introduction', 'looking_for', 'discussion', 'question', 'event', 'other'])).optional(),
  status: z.array(z.enum(['published', 'hidden', 'flagged', 'deleted', 'pending_review'])).optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  searchTerm: z.string().min(1).max(200).optional(),
  sortBy: z.enum(['newest', 'oldest', 'popular', 'commented']).default('newest'),
});

// Export inferred types
export type PostSchema = z.infer < typeof postSchema > ;
export type CreatePostSchema = z.infer < typeof createPostSchema > ;
export type UpdatePostSchema = z.infer < typeof updatePostSchema > ;
export type PostFiltersSchema = z.infer < typeof postFiltersSchema > ;