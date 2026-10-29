import React from 'react';
import { Heart, Handshake, Crown, Check, CheckCheck } from 'lucide-react';
import styles from '../styles/ConnectionStatusCard.module.css';

interface ConnectionStatusCardProps {
  matchId: string;
  targetUserName: string;
  targetUserId: string;
  targetAvatarUrl: string | null;
  onViewProfile: (userId: string) => void;
  myInterest: boolean;
  otherInterest: boolean;
  onExpressInterest: (matchId: string) => void;
  loading: boolean;
}

export const ConnectionStatusCard: React.FC<ConnectionStatusCardProps> = ({
  targetUserId,
  targetAvatarUrl,
  onViewProfile,
  matchId,
  targetUserName,
  myInterest,
  otherInterest,
  onExpressInterest,
  loading,
}) => {
  const isMutual = myInterest && otherInterest;

  return (
    <div className={`${styles.card} ${isMutual ? styles.cardMutual : ''}`}>
      <div className={styles.row}>
        <button
          onClick={() => onViewProfile(targetUserId)}
          aria-label={`View ${targetUserName} profile`}
          className={styles.avatarButton}
        >
          {targetAvatarUrl ? (
            <img src={targetAvatarUrl} alt={targetUserName} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarInitial}>
              {targetUserName.charAt(0).toUpperCase()}
            </span>
          )}
        </button>
        <div className={styles.info}>
          <h3 className={styles.title}>Getting to Know {targetUserName}</h3>
          <p className={styles.subtitle}>
            {isMutual
              ? 'You both expressed interest! 🎉'
              : myInterest
                ? "You've expressed interest. Waiting for their response..."
                : otherInterest
                  ? 'They expressed interest in you!'
                  : 'Express interest to continue the connection.'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className={styles.progress}>
        <div className={`${styles.progressSegment} ${styles.progressSegmentActive}`} />
        <div className={`${styles.progressSegment} ${myInterest ? styles.progressSegmentActive : ''}`} />
        <div className={`${styles.progressSegment} ${isMutual ? styles.progressSegmentActive : ''}`} />
      </div>

      {/* Actions */}
      {!myInterest && !isMutual && (
        <button
          className={styles.actionPrimary}
          onClick={() => onExpressInterest(matchId)}
          disabled={loading}
        >
          <Handshake size={16} />
          {loading ? 'Sending...' : "I'm Interested"}
        </button>
      )}

      {myInterest && !otherInterest && (
        <div className={styles.pillWarning}>
          <Check size={14} />
          Interest sent! Waiting for {targetUserName}...
        </div>
      )}

      {isMutual && (
        <div className={styles.pillSuccess}>
          <Crown size={14} />
          Mutual interest! You've matched! 🎉
        </div>
      )}
    </div>
  );
};