import React from 'react';
import { X, Link2, Send } from 'lucide-react';
import styles from '../styles/ShareSheet.module.css';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  postUrl: string;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ open, onClose, postUrl }) => {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      alert('Link copied to clipboard!');
      onClose();
    } catch {
      alert('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post on Dating App',
          url: postUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />
        <div className={styles.header}>
          <h3 className={styles.title}>Share</h3>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.options}>
          <button className={styles.shareOption} onClick={handleNativeShare}>
            <Send size={20} />
            <span>Share via apps</span>
          </button>
          <button className={styles.shareOption} onClick={handleCopyLink}>
            <Link2 size={20} />
            <span>Copy link</span>
          </button>
        </div>
      </div>
    </div>
  );
};
