import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, X, Gift, Image as ImageIcon, Smile } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { ChatMessage } from '../../types/chat.types';
import styles from '../styles/MessageComposer.module.css';
import { MediaEditor } from './MediaEditor/MediaEditor';
import { useSettings } from '@/hooks/useSettings';

const MAX_VIDEO_DURATION_SECONDS = 180; // 3 minutes
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

/**
 * Load the video file into an off-screen <video> element and wait for
 * metadata so we can read its duration. Times out at 3s to avoid hanging.
 */
const probeVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 3000);
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const d = video.duration;
      cleanup();
      resolve(Number.isFinite(d) ? d : 0);
    };
    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('failed to load'));
    };
    video.src = url;
  });
};

interface MessageComposerProps {
  conversationId: string;
  userId: string;
  onSend: (content: string) => void;
  onSendImage: (file: File, quality?: 'hd' | 'sd', caption?: string) => Promise<void>;
  onSendVideo: (file: File, quality?: 'hd' | 'sd', caption?: string) => Promise<void>;
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
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const handleMediaSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    // Reset the input so the same file can be picked again after an error
    if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    setAttachmentMenuOpen(false);

    const isVideoFile = file.type.startsWith('video/');
    const isImageFile = file.type.startsWith('image/');
    if (!isVideoFile && !isImageFile) return;

    // HEIC/HEIF rejection — Chrome cannot decode these
    const isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
    if (isHeic) {
      showToast('HEIC photos are not supported. Please use JPG or PNG, or convert in Photos app first.');
      return;
    }

    // ── Image validation ──
    if (isImageFile) {
      if (file.size > 20 * 1024 * 1024) {
        showToast('Image is too large. Please use images under 20MB.');
        return;
      }
      setPendingMedia(file);
      return;
    }

    // ── Video validation ──
    if (isVideoFile) {
      // Size check (100MB cap)
      if (file.size > 100 * 1024 * 1024) {
        showToast('Video file is too large. Please send videos under 100MB.');
        return;
      }

      // Duration check (180s = 3 minutes cap) — probe metadata
      try {
        const duration = await probeVideoDuration(file);
        if (duration && duration > 600) {
          const mins = Math.floor(duration / 60);
          const secs = Math.floor(duration % 60);
          showToast(`Video is too long (${mins}:${secs.toString().padStart(2, '0')}). Please send videos under 10 minutes.`);
          return;
        }
      } catch {
        // Probe failed — reject the file. Do not open MediaEditor with an unreadable video.
        showToast('Could not read this video file. Please try a different video.');
        return;
      }

      // Duration confirmed under 3 minutes — safe to open editor
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

      {/* Rejection toast */}
      {toast && (
        <div className={styles.toast}>
          <span className={styles.toastIcon}>⚠️</span>
          <span className={styles.toastText}>{toast}</span>
        </div>
      )}

      {pendingMedia && (
        <MediaEditor
          file={pendingMedia}
          initialQuality="hd"
          onCancel={() => setPendingMedia(null)}
          onConfirm={async (result) => {
            try {
              if (result.file.type.startsWith('video/')) {
                await onSendVideo(result.file, result.quality, result.caption);
              } else if (result.file.type.startsWith('image/')) {
                await onSendImage(result.file, result.quality, result.caption);
              }
              if (result.isLast) setPendingMedia(null);
            } catch (err) {
              console.error('[MessageComposer] Send failed:', err);
            }
          }}
        />
      )}
    </div>
  );
};


