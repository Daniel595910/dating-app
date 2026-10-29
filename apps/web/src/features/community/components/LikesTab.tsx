import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';
import styles from '../styles/LikesTab.module.css';

interface LikedConnection {
  matchId: string;
  targetUserId: string;
  targetUserName: string;
  targetAvatarUrl?: string | null;
  myInterest: boolean;
  otherInterest: boolean;
}

interface LikesTabProps {
  likes: LikedConnection[];
  onLikeBack: (matchId: string) => Promise<boolean>;
  onSkipLike: (matchId: string) => Promise<boolean>;
  onViewProfile: (userId: string) => void;
  loading: boolean;
}

export const LikesTab: React.FC<LikesTabProps> = ({
  likes,
  onLikeBack,
  onSkipLike,
  onViewProfile,
  loading,
}) => {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleLikeBack = async (matchId: string) => {
    setPendingId(matchId);
    try {
      await onLikeBack(matchId);
    } finally {
      setPendingId(null);
    }
  };

  const handleSkip = async (matchId: string) => {
    setPendingId(matchId);
    try {
      await onSkipLike(matchId);
    } finally {
      setPendingId(null);
    }
  };

  if (likes.length === 0) {
    return (
      <div className={styles.empty}>
        <Heart size={40} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No likes yet</p>
        <p className={styles.emptyText}>
          When someone expresses interest in you, they will appear here so you can decide if you want to like back.
        </p>
      </div>
    );
  }

  return (
    <div>
      {likes.map((connection) => {
        const isPending = pendingId === connection.matchId;
        return (
          <div key={connection.matchId} className={styles.card}>
            <div className={styles.row}>
              <button
                onClick={() => onViewProfile(connection.targetUserId)}
                aria-label={`View ${connection.targetUserName} profile`}
                className={styles.avatarButton}
              >
                {connection.targetAvatarUrl ? (
                  <img
                    src={connection.targetAvatarUrl}
                    alt={connection.targetUserName}
                    className={styles.avatarImg}
                  />
                ) : (
                  <span className={styles.avatarInitial}>
                    {connection.targetUserName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              <button
                onClick={() => onViewProfile(connection.targetUserId)}
                className={styles.nameButton}
              >
                <span className={styles.name}>{connection.targetUserName}</span>
                <span className={styles.likedBadge}>❤️ Liked you</span>
              </button>
            </div>
            <div className={styles.actions}>
              <button
                onClick={() => handleLikeBack(connection.matchId)}
                disabled={loading || isPending}
                className={styles.btnPrimary}
              >
                <Heart size={16} />
                {isPending ? 'Liking…' : 'Like Back'}
              </button>
              <button
                onClick={() => handleSkip(connection.matchId)}
                disabled={loading || isPending}
                className={styles.btnSecondary}
              >
                <X size={16} />
                Skip
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};