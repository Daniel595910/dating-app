import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, X, Gift, Image as ImageIcon, Smile } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { ChatMessage } from '../../types/chat.types';
import styles from '../styles/MessageComposer.module.css';
import { MediaEditor } from './MediaEditor/MediaEditor';
import { useSettings } from '@/hooks/useSettings';

interface MessageComposerProps {
  conversationId: string;
  userId: string;
  onSend: (content: string) => void;
  onSendImage: (file: File, quality?: 'hd' | 'sd', caption?: string) => void;
  onSendVideo: (file: File, quality?: 'hd' | 'sd', caption?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  onOpenGift?: () => void;
  onOpenStickerPicker?: () => void;
  quality?: 'hd' | 'sd';
  onQualityChange?: (q: 'hd' | 'sd') => void;
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
  quality = 'sd',
  onQualityChange,
  disabled = false,
}) => {
  const [content, setContent] = useState('');
  const maxMessageLength = useSettings((s) => s.settings['general.max_message_length']) || 10000;
  const [sending, setSending] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);

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
    if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
      setPendingMedia(file);
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

      
      {onQualityChange && (
        <div className={styles.qualityToggle} role="group" aria-label="Media quality">
          <button
            type="button"
            className={`${styles.qualityOption} ${quality === 'sd' ? styles.qualityOptionActive : ''}`}
            onClick={() => onQualityChange('sd')}
            aria-pressed={quality === 'sd'}
          >
            SD
          </button>
          <button
            type="button"
            className={`${styles.qualityOption} ${quality === 'hd' ? styles.qualityOptionActive : ''}`}
            onClick={() => onQualityChange('hd')}
            aria-pressed={quality === 'hd'}
          >
            HD
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

      {pendingMedia && (
        <MediaEditor
          file={pendingMedia}
          initialQuality={quality}
          onCancel={() => setPendingMedia(null)}
          onConfirm={(result) => {
            setPendingMedia(null);
            if (result.file.type.startsWith('video/')) {
              onSendVideo(result.file, result.quality, result.caption);
            } else if (result.file.type.startsWith('image/')) {
              onSendImage(result.file, result.quality, result.caption);
            }
          }}
        />
      )}
    </div>
  );
};


