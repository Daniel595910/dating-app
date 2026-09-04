import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import styles from '../styles/MessageComposer.module.css';

interface MessageComposerProps {
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ onSend, onTyping }) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    onTyping(false);
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
    onTyping(e.target.value.length > 0);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
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
