import React from 'react';
import { X, Link2, Send, Check } from 'lucide-react';
import styles from '../styles/ShareSheet.module.css';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  postUrl: string;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ open, onClose, postUrl }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post on Dating App',
          url: postUrl,
        });
        onClose();
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
          <h3 className={styles.title}>{copied ? 'Link Copied!' : 'Share'}</h3>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {copied ? (
          <div className={styles.copiedState}>
            <Check size={32} className={styles.copiedIcon} />
            <p className={styles.copiedText}>Link copied to clipboard</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};
