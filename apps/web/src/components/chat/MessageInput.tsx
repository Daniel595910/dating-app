/**
 * MessageInput Component
 * Message composer with send functionality
 */

import React, { useState } from 'react';
import { supabase } from '@/config/supabase.client';
import { APP_LIMITS } from '@/config/constants';
import styles from './MessageInput.module.css';

interface MessageInputProps {
  conversationId: string;
}

export const MessageInput: React.FC < MessageInputProps > = ({ conversationId }) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSend = async () => {
    if (!content.trim() || sending) return;
    
    setSending(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error: sendError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        type: 'text',
        content: content.trim(),
        status: 'sent',
      });
      
      if (sendError) throw sendError;
      
      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.trim().substring(0, 100),
        })
        .eq('id', conversationId);
      
      setContent('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className={styles.container}>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.inputRow}>
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          maxLength={APP_LIMITS.MESSAGE_CONTENT_MAX_LENGTH}
          rows={1}
          disabled={sending}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!content.trim() || sending}
          aria-label="Send message"
        >
          {sending ? (
            <span className={styles.spinner} />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};