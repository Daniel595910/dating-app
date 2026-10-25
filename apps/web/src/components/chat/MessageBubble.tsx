/**
 * MessageBubble Component
 * Individual message bubble
 */

import React from 'react';
import { Message } from '@dating-app/types';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC < MessageBubbleProps > = ({ message, isOwn }) => {
  const bubbleClasses = [
      styles.bubble,
      isOwn ? styles.ownBubble : styles.otherBubble,
    ]
    .filter(Boolean)
    .join(' ');
  
  const isSticker = message.type === 'image' && Boolean(
    (message as any).metadata && (message as any).metadata.is_sticker
  );

  const timeLabel = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusLabel =
    message.status === 'read' ? 'Read' :
    message.status === 'delivered' ? 'Delivered' :
    'Sent';

  if (isSticker && message.media_url) {
    return (
      <div className={`${styles.wrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}>
        <div className={styles.stickerWrapper}>
          <img
            src={message.media_url}
            alt={message.content || 'Sticker'}
            className={styles.sticker}
          />
          <div className={styles.stickerMeta}>
            <span className={styles.timestamp}>{timeLabel}</span>
            {isOwn && <span className={styles.status}>{statusLabel}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}>
      <div className={bubbleClasses}>
        {message.type === 'image' && message.media_url ? (
          <img
            src={message.media_url}
            alt="Message attachment"
            className={styles.image}
          />
        ) : (
          <p className={styles.content}>{message.content}</p>
        )}
        <div className={styles.meta}>
          <span className={styles.timestamp}>{timeLabel}</span>
          {isOwn && <span className={styles.status}>{statusLabel}</span>}
        </div>
      </div>
    </div>
  );
};