/**
 * MatchRequest Component
 * Modal for sending match requests
 */

import React, { useState } from 'react';
import { supabase } from '@/config/supabase.client';
import { APP_LIMITS } from '@/config/constants';
import { Modal, Button, Input } from '@dating-app/ui';
import styles from './MatchRequest.module.css';

interface MatchRequestProps {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  onRequestSent ? : () => void;
}

export const MatchRequest: React.FC < MatchRequestProps > = ({
  open,
  onClose,
  targetUserId,
  targetUserName,
  onRequestSent,
}) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error: insertError } = await supabase.from('match_requests').insert({
        requester_id: user.id,
        target_id: targetUserId,
        message: message.trim() || null,
        status: 'pending',
      });
      
      if (insertError) throw insertError;
      
      setMessage('');
      onRequestSent?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send match request');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Match Request"
      description={`Start getting to know ${targetUserName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Send Request
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input
          textarea
          label="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say something nice..."
          maxLength={APP_LIMITS.MATCH_REQUEST_MESSAGE_MAX_LENGTH}
          helperText={`${message.length}/${APP_LIMITS.MATCH_REQUEST_MESSAGE_MAX_LENGTH}`}
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </Modal>
  );
};