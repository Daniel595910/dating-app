import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/MessageComposer.module.css';

interface MessageComposerProps {
  conversationId: string;
  userId: string;
  onSend: (content: string) => void;
  onTypingChange: (isTyping: boolean) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  userId,
  onSend,
  onTypingChange,
}) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const broadcastTyping = async (isTyping: boolean) => {
    const now = Date.now();
    // Throttle: only broadcast every 2 seconds max
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
      // Ignore broadcast errors
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

  return (
    <div className={styles.composer}>
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
      <button
        className={styles.sendButton}
        onClick={handleSend}
        disabled={!content.trim() || sending}
        aria-label="Send message"
      >
        <Send size={18} />
      </button>
    </div>
  );
};
