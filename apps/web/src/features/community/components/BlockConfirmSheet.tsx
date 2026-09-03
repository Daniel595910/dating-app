import React, { useState } from 'react';
import { X, Ban } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/BlockConfirmSheet.module.css';

interface BlockConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  blockerId: string;
  targetUserId: string;
  targetUserName: string;
  onBlocked: () => void;
}

export const BlockConfirmSheet: React.FC<BlockConfirmSheetProps> = ({
  open,
  onClose,
  blockerId,
  targetUserId,
  targetUserName,
  onBlocked,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlock = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('blocks').insert({
        blocker_id: blockerId,
        blocked_id: targetUserId,
      });

      if (insertError) throw insertError;

      onBlocked();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to block user');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.iconWrapper}>
          <Ban size={28} className={styles.banIcon} />
        </div>

        <h2 className={styles.title}>Block {targetUserName}?</h2>

        <p className={styles.description}>
          You won&apos;t see their posts, and they won&apos;t be able to contact you.
          You can unblock them later from settings.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            className={styles.blockButton}
            onClick={handleBlock}
            disabled={submitting}
          >
            {submitting ? 'Blocking...' : 'Block User'}
          </button>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
