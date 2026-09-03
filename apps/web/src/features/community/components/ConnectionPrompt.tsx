import React, { useState } from 'react';
import { X, Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/ConnectionPrompt.module.css';

interface ConnectionPromptProps {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  currentUserId: string;
  onConnectionStarted?: (connectionId: string) => void;
}

export const ConnectionPrompt: React.FC<ConnectionPromptProps> = ({
  open,
  onClose,
  targetUserId,
  targetUserName,
  currentUserId,
  onConnectionStarted,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleSendRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('match_requests')
        .insert({
          requester_id: currentUserId,
          target_id: targetUserId,
          message: message.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      onConnectionStarted?.(data.id);
      onClose();
    } catch (err: any) {
      if (err.code === '23505') {
        setError('You already sent a request to this person.');
      } else {
        setError(err.message || 'Failed to send request');
      }
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

        <div className={styles.iconWrapper}>
          <Heart size={32} className={styles.heartIcon} />
        </div>

        <h2 className={styles.title}>Get to Know {targetUserName}</h2>

        <p className={styles.description}>
          You can start by getting to know each other gradually. Take your time and see
          if there&apos;s a connection.
        </p>

        <textarea
          className={styles.messageInput}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Say something nice to ${targetUserName}... (optional)`}
          rows={3}
          maxLength={500}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            className={styles.sendButton}
            onClick={handleSendRequest}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Get to Know'}
          </button>
          <button className={styles.cancelButton} onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
