import React from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { PostStats, PostViewerState } from '../../types/community.types';
import styles from '../styles/PostActions.module.css';

interface PostActionsProps {
  postId: string;
  stats: PostStats;
  viewer: PostViewerState;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

export const PostActions: React.FC<PostActionsProps> = ({
  postId,
  stats,
  viewer,
  onLike,
  onComment,
  onShare,
}) => {
  return (
    <div className={styles.actionsBar}>
      <button
        className={`${styles.actionButton} ${viewer.liked ? styles.actionButtonLiked : ''}`}
        onClick={() => onLike(postId)}
        aria-label={viewer.liked ? 'Unlike' : 'Like'}
      >
        <Heart size={18} fill={viewer.liked ? '#ef4444' : 'none'} />
        <span>{stats.likes}</span>
      </button>

      <button
        className={styles.actionButton}
        onClick={() => onComment(postId)}
        aria-label="Comments"
      >
        <MessageCircle size={18} />
        <span>{stats.comments}</span>
      </button>

      <button
        className={`${styles.actionButton} ${styles.shareButton}`}
        onClick={() => onShare(postId)}
        aria-label="Share"
      >
        <Share2 size={18} />
      </button>
    </div>
  );
};
