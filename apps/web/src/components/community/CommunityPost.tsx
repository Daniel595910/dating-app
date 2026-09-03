/**\n * CommunityPost Component
 * Individual post card in the community feed
 */

import React, { useState } from 'react';
import { Post } from '@dating-app/types';
import { UserAvatar } from '../common/UserAvatar';
import styles from './CommunityPost.module.css';

interface CommunityPostProps {
  post: Post;
}

export const CommunityPost: React.FC<CommunityPostProps> = ({ post }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);

  const handleLike = () => {
    if (liked) {
      setLikeCount((prev) => Math.max(prev - 1, 0));
    } else {
      setLikeCount((prev) => prev + 1);
    }
    setLiked(!liked);
  };

  return (
    <article className={styles.post}>
      <div className={styles.header}>
        <UserAvatar name={post.author_id} size="sm" />
        <div className={styles.authorInfo}>
          <span className={styles.authorName}>User</span>
          <span className={styles.timestamp}>
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
        <span className={styles.typeBadge}>{post.type}</span>
      </div>

      <p className={styles.content}>{post.content}</p>

      {post.tags && post.tags.length > 0 && (
        <div className={styles.tags}>
          {post.tags.map((tag, index) => (
            <span key={index} className={styles.tag}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {post.images && post.images.length > 0 && (
        <div className={styles.images}>
          {post.images.map((image, index) => (
            <img key={index} src={image} alt={`Post image ${index + 1}`} className={styles.image} />
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={`${styles.actionButton} ${liked ? styles.liked : ''}`}
          onClick={handleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{likeCount}</span>
        </button>

        <button
          className={styles.actionButton}
          onClick={() => setShowComments(!showComments)}
          aria-label="Comments"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>{post.comment_count}</span>
        </button>
      </div>

      {showComments && (
        <div className={styles.comments}>
          <p className={styles.commentsPlaceholder}>Comments coming soon...</p>
        </div>
      )}
    </article>
  );
};

