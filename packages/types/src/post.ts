/**
 * Post Types
 * Community posts and related types
 */

export type PostType = 'introduction' | 'looking_for' | 'discussion' | 'question' | 'event' | 'other';

export type PostStatus = 'published' | 'hidden' | 'flagged' | 'deleted' | 'pending_review';

export interface Post {
  id: string;
  communityId: string;
  authorId: string;
  type: PostType;
  content: string;
  status: PostStatus;
  images ? : string[] | null;
  tags ? : string[] | null;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  isEdited: boolean;
  editedAt ? : string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostInput {
  communityId: string;
  authorId: string;
  type: PostType;
  content: string;
  images ? : string[];
  tags ? : string[];
}

export interface UpdatePostInput {
  content ? : string;
  type ? : PostType;
  images ? : string[];
  tags ? : string[];
  status ? : PostStatus;
}

export interface PostFilters {
  communityId ? : string;
  authorId ? : string;
  type ? : PostType[];
  status ? : PostStatus[];
  tags ? : string[];
  dateRange ? : {
    start: string;
    end: string;
  };
  searchTerm ? : string;
  sortBy ? : 'newest' | 'oldest' | 'popular' | 'commented';
}