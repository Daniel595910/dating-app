import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, X, Gift, Image as ImageIcon, Smile } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { ChatMessage } from '../../types/chat.types';
import styles from '../styles/MessageComposer.module.css';
import { useSettings } from '@/hooks/useSettings';

interface MessageComposerProps {
  conversationId: string;
  userId: string;
  onSend: (content: string) => void;
  onSendImage: (file: File) => void;
  onSendVideo: (file: File) => void;
  onTypingChange: (isTyping: boolean) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  onOpenGift?: () => void;
  onOpenStickerPicker?: () => void;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  userId,
  onSend,
  onSendImage,
  onSendVideo,
  onTypingChange,
  replyingTo,
  onCancelReply,
  onOpenGift,
  onOpenStickerPicker,
  disabled = false,
}) => {
  const [content, setContent] = useState('');
  const maxMessageLength = useSettings((s) => s.settings['general.max_message_length']) || 10000;
  const [sending, setSending] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
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

  const handleMediaSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    setAttachmentMenuOpen(false);
    if (file.type.startsWith('video/')) {
      onSendVideo(file);
    } else if (file.type.startsWith('image/')) {
      onSendImage(file);
    }
  };



  return (
    <div className={styles.composerWrapper}>
      {replyingTo && (
        <div className={styles.replyIndicator}>
          <div className={styles.replyIndicatorContent}>
            <span className={styles.replyLabel}>Replying to {replyingTo.senderName}</span>
            <span className={styles.replyPreview}>{replyingTo.content.substring(0, 60)}</span>
          </div>
          <button className={styles.cancelReplyButton} onClick={onCancelReply} aria-label="Cancel reply">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Attachment menu */}
      {attachmentMenuOpen && (
        <div className={styles.attachmentMenu}>
          <button className={styles.attachmentOption} onClick={() => mediaFileInputRef.current?.click()}>
            <ImageIcon size={18} />
            <span>Media</span>
          </button>

          <button className={styles.attachmentOption} onClick={onOpenStickerPicker}>
            <Smile size={18} />
            <span>Stickers</span>
          </button>
          <button className={styles.attachmentOption} onClick={onOpenGift}>
            <Gift size={18} />
            <span>Gift</span>
          </button>
        </div>
      )}

      <div className={styles.composer}>
        <input
          ref={mediaFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={(e) => handleMediaSelect(e.target.files)}
          style={{ display: 'none' }}
        />


        <button
          className={styles.attachButton}
          onClick={() => setAttachmentMenuOpen((prev) => !prev)}
          aria-label="Attach file"
        >
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
          maxLength={maxMessageLength}
          disabled={sending}
        />



        <button className={styles.sendButton} onClick={handleSend} disabled={!content.trim() || sending || disabled} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};


