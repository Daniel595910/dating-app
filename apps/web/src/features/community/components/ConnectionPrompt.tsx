import React, { useState } from 'react';
import { X, Heart } from 'lucide-react';
import styles from '../styles/ConnectionPrompt.module.css';

interface ConnectionPromptProps {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  onSendRequest: (targetId: string, message?: string) => Promise<boolean>;
}

export const ConnectionPrompt: React.FC<ConnectionPromptProps> = ({
  open,
  onClose,
  targetUserId,
  targetUserName,
  onSendRequest,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setError(null);

    try {
      const success = await onSendRequest(targetUserId, message.trim() || undefined);
      if (success) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setMessage('');
          onClose();
        }, 1500);
      } else {
        setError('Failed to send request');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />
        <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
          <X size={20} />
        </button>

        {sent ? (
          <div className={styles.sentState}>
            <div className={styles.sentIcon}>✓</div>
            <p className={styles.sentText}>Request sent to {targetUserName}!</p>
          </div>
        ) : (
          <>
            <div className={styles.iconWrapper}>
              <Heart size={32} className={styles.heartIcon} />
            </div>
            <h2 className={styles.title}>Get to Know {targetUserName}</h2>
            <p className={styles.description}>
              You can start by getting to know each other gradually. Take your time.
            </p>
            <textarea
              className={styles.messageInput}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Say something nice... (optional)`}
              rows={3}
              maxLength={500}
            />
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button className={styles.sendButton} onClick={handleSend} disabled={loading}>
                {loading ? 'Sending...' : 'Send Request'}
              </button>
              <button className={styles.cancelButton} onClick={onClose} disabled={loading}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
