/**
 * Comment Types
 * Post comments and related types
 */

export type CommentStatus = 'published' | 'hidden' | 'flagged' | 'deleted';

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId ? : string | null;
  content: string;
  status: CommentStatus;
  likeCount: number;
  reportCount: number;
  isEdited: boolean;
  editedAt ? : string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  postId: string;
  authorId: string;
  content: string;
  parentId ? : string;
}

export interface UpdateCommentInput {
  content ? : string;
  status ? : CommentStatus;
}

export interface CommentFilters {
  postId ? : string;
  authorId ? : string;
  parentId ? : string;
  status ? : CommentStatus[];
  sortBy ? : 'newest' | 'oldest' | 'popular';
}