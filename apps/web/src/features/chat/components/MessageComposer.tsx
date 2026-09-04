import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, X } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { ChatMessage } from '../../types/chat.types';
import styles from '../styles/MessageComposer.module.css';

interface MessageComposerProps {
  conversationId: string;
  userId: string;
  onSend: (content: string) => void;
  onSendImage: (file: File) => void;
  onTypingChange: (isTyping: boolean) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  userId,
  onSend,
  onSendImage,
  onTypingChange,
  replyingTo,
  onCancelReply,
}) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);

  useEffect(() => {
    inputRef.current?.focus();
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const broadcastTyping = async (isTyping: boolean) => {
    const now = Date.now();
    if (isTyping && now - lastTypingBroadcastRef.current < 2000) return;
    lastTypingBroadcastRef.current = now;

    try {
      const channel = supabase.channel(`typing:${conversationId}`);
      await channel.send({
        type: 'broadcast',
        event: isTyping ? 'typing' : 'stop_typing',
        payload: { userId },
      });
    } catch {
      // Ignore
    }
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    await broadcastTyping(false);
    onTypingChange(false);
    onSend(trimmed);
    setContent('');
    setSending(false);
    if (onCancelReply) onCancelReply();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const isTyping = e.target.value.length > 0;
    onTypingChange(isTyping);
    broadcastTyping(isTyping);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false);
      broadcastTyping(false);
    }, 2500);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      onSendImage(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.composerWrapper}>
      {/* Reply indicator */}
      {replyingTo && (
        <div className={styles.replyIndicator}>
          <div className={styles.replyIndicatorContent}>
            <span className={styles.replyLabel}>
              Replying to {replyingTo.senderName}
            </span>
            <span className={styles.replyPreview}>
              {replyingTo.content.substring(0, 60)}
            </span>
          </div>
          <button className={styles.cancelReplyButton} onClick={onCancelReply} aria-label="Cancel reply">
            <X size={14} />
          </button>
        </div>
      )}

      <div className={styles.composer}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />

        <button className={styles.attachButton} onClick={() => fileInputRef.current?.click()} aria-label="Attach image">
          <Plus size={20} />
        </button>

        <textarea
          ref={inputRef}
          className={styles.input}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          maxLength={10000}
          disabled={sending}
        />

        <button className={styles.sendButton} onClick={handleSend} disabled={!content.trim() || sending} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
