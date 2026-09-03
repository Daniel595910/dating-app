import React from 'react';
import { X, MessageCircle, Heart } from 'lucide-react';
import styles from '../styles/MatchSuccess.module.css';

interface MatchSuccessProps {
  open: boolean;
  onClose: () => void;
  matchedUserName: string;
  onStartChat: () => void;
}

export const MatchSuccess: React.FC<MatchSuccessProps> = ({
  open,
  onClose,
  matchedUserName,
  onStartChat,
}) => {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
          <X size={20} />
        </button>

        <div className={styles.celebration}>
          <div className={styles.heartContainer}>
            <Heart size={64} className={styles.heartIcon} />
          </div>

          <h2 className={styles.title}>It&apos;s a Match!</h2>

          <p className={styles.message}>
            You and {matchedUserName} both want to continue getting to know each other.
          </p>

          <div className={styles.sparkles}>
            <span className={styles.sparkle}>✨</span>
            <span className={styles.sparkle}>💕</span>
            <span className={styles.sparkle}>✨</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.chatButton} onClick={onStartChat}>
            <MessageCircle size={18} />
            Start Chat
          </button>
          <button className={styles.laterButton} onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
