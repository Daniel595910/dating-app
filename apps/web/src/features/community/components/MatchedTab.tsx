import React, { useState } from 'react';
import { Heart, MessageCircle, X } from 'lucide-react';
import styles from '../styles/MatchedTab.module.css';

interface MatchedConnection {
  matchId: string;
  targetUserId: string;
  targetUserName: string;
  targetAvatarUrl?: string | null;
  myInterest: boolean;
  otherInterest: boolean;
}

interface MatchedTabProps {
  matched: MatchedConnection[];
  onUnmatch: (matchId: string, otherUserId: string) => Promise<boolean>;
  onOpenChat: (matchId: string) => void;
  onViewProfile: (userId: string) => void;
  loading: boolean;
}

export const MatchedTab: React.FC<MatchedTabProps> = ({
  matched,
  onUnmatch,
  onOpenChat,
  onViewProfile,
  loading,
}) => {
  const [unmatchTarget, setUnmatchTarget] = useState<MatchedConnection | null>(null);
  const [unmatching, setUnmatching] = useState(false);

  const handleConfirmUnmatch = async () => {
    if (!unmatchTarget) return;
    setUnmatching(true);
    try {
      await onUnmatch(unmatchTarget.matchId, unmatchTarget.targetUserId);
      setUnmatchTarget(null);
    } finally {
      setUnmatching(false);
    }
  };

  if (matched.length === 0) {
    return (
      <div className={styles.empty}>
        <Heart size={40} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No matches yet</p>
        <p className={styles.emptyText}>
          When you and someone both express interest, you will match here and can start chatting.
        </p>
      </div>
    );
  }

  return (
    <div>
      {matched.map((connection) => (
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
              <span className={styles.matchedBadge}>💕 Matched</span>
            </button>
          </div>
          <div className={styles.actions}>
            <button
              onClick={() => onOpenChat(connection.matchId)}
              className={styles.btnPrimary}
            >
              <MessageCircle size={16} />
              Chat
            </button>
            <button
              onClick={() => setUnmatchTarget(connection)}
              disabled={loading}
              className={styles.btnDangerOutline}
            >
              Unmatch
            </button>
          </div>
        </div>
      ))}

      {unmatchTarget && (
        <div
          className={styles.overlay}
          onClick={() => !unmatching && setUnmatchTarget(null)}
        >
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>Unmatch?</h3>
            <p className={styles.dialogBody}>
              You are about to unmatch{' '}
              <strong className={styles.dialogStrong}>{unmatchTarget.targetUserName}</strong>.
              The conversation will be closed for both of you.
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setUnmatchTarget(null)}
                disabled={unmatching}
                className={styles.dialogCancel}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnmatch}
                disabled={unmatching}
                className={styles.dialogConfirm}
              >
                {unmatching ? 'Unmatching…' : 'Unmatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};