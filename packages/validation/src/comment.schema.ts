/**
 * Comment Validation Schemas
 * Validation for post comments
 */

import { z } from 'zod';
import { ValidationMessages } from './utils';

// Comment schema
export const commentSchema = z.object({
  id: z.string().uuid(ValidationMessages.uuid),
  postId: z.string().uuid(ValidationMessages.uuid),
  authorId: z.string().uuid(ValidationMessages.uuid),
  parentId: z.string().uuid().nullable().optional(),
  content: z.string().min(1, ValidationMessages.required).max(2000, ValidationMessages.maxLength(2000)),
  status: z.enum(['published', 'hidden', 'flagged', 'deleted']).default('published'),
  likeCount: z.number().int().nonNegative().default(0),
  reportCount: z.number().int().nonNegative().default(0),
  isEdited: z.boolean().default(false),
  editedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Create comment schema
export const createCommentSchema = z.object({
  postId: z.string().uuid(ValidationMessages.uuid),
  authorId: z.string().uuid(ValidationMessages.uuid),
  content: z.string().min(1, ValidationMessages.required).max(2000, ValidationMessages.maxLength(2000)),
  parentId: z.string().uuid().optional(),
});

// Update comment schema
export const updateCommentSchema = z.object({
  content: z.string().min(1, ValidationMessages.required).max(2000, ValidationMessages.maxLength(2000)).optional(),
  status: z.enum(['published', 'hidden', 'flagged', 'deleted']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Comment filters schema
export const commentFiltersSchema = z.object({
  postId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  status: z.array(z.enum(['published', 'hidden', 'flagged', 'deleted'])).optional(),
  sortBy: z.enum(['newest', 'oldest', 'popular']).default('newest'),
});

// Export inferred types
export type CommentSchema = z.infer < typeof commentSchema > ;
export type CreateCommentSchema = z.infer < typeof createCommentSchema > ;
export type UpdateCommentSchema = z.infer < typeof updateCommentSchema > ;
export type CommentFiltersSchema = z.infer < typeof commentFiltersSchema > ;