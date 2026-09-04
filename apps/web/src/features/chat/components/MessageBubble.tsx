import React, { useState } from 'react';
import { Check, CheckCheck, AlertCircle, RotateCcw, Reply } from 'lucide-react';
import { ChatMessage } from '../../types/chat.types';
import { ImagePreviewModal } from '../../community/components/ImagePreviewModal';
import styles from '../styles/MessageBubble.module.css';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSenderName?: boolean;
  onRetry?: (messageId: string, content: string) => void;
  onReply?: (message: ChatMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showSenderName = false,
  onRetry,
  onReply,
}) => {
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isFailed = message.status === 'failed';

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <span className={styles.sendingDot} />;
      case 'sent':
        return <Check size={14} />;
      case 'delivered':
        return <CheckCheck size={14} />;
      case 'read':
        return <CheckCheck size={14} className={styles.readIcon} />;
      case 'failed':
        return <AlertCircle size={14} className={styles.failedIcon} />;
      default:
        return <Check size={14} />;
    }
  };

  const handleBubbleClick = () => {
    if (message.type === 'text') {
      setShowActions((prev) => !prev);
    }
  };

  const handleReply = () => {
    setShowActions(false);
    onReply?.(message);
  };

  const renderContent = () => {
    if (message.type === 'image' && message.metadata?.imageUrl) {
      return (
        <div className={styles.imageMessageContainer}>
          <img
            src={message.metadata.thumbnailUrl || message.metadata.imageUrl}
            alt=""
            loading="lazy"
            className={styles.imageMessage}
            onClick={() => setImagePreviewOpen(true)}
          />
        </div>
      );
    }

    if (message.type === 'voice' && message.metadata?.durationMs) {
      return (
        <div className={styles.voiceMessageContainer}>
          <button className={styles.voicePlayButton} aria-label="Play voice message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="8 5 19 12 8 19 8 5" />
            </svg>
          </button>
          <div className={styles.voiceWaveform}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <span key={i} className={styles.voiceWaveformBar} />
            ))}
          </div>
          <span className={styles.voiceDuration}>
            {Math.floor(message.metadata.durationMs / 1000)}s
          </span>
        </div>
      );
    }

    if (message.type === 'gift' && message.metadata?.giftIcon) {
      return (
        <div className={styles.giftMessageContainer}>
          <span className={styles.giftIcon}>{message.metadata.giftIcon}</span>
          <span className={styles.giftName}>{message.metadata.giftName || 'Gift'}</span>
        </div>
      );
    }

    return <p className={styles.content}>{message.content}</p>;
  };

  return (
    <div className={`${styles.wrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}>
      <div
        className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble} ${isFailed ? styles.failedBubble : ''} ${showActions ? styles.bubbleActive : ''}`}
        onClick={handleBubbleClick}
      >
        {!isOwn && showSenderName && (
          <span className={styles.senderName}>{message.senderName}</span>
        )}
        {renderContent()}
        <div className={styles.meta}>
          <span className={styles.timestamp}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <span className={styles.status}>
              {getStatusIcon()}
            </span>
          )}
        </div>

        {isFailed && onRetry && (
          <button className={styles.retryButton} onClick={() => onRetry(message.id, message.content)}>
            <RotateCcw size={12} />
            Retry
          </button>
        )}
      </div>

      {showActions && onReply && message.type === 'text' && (
        <button className={styles.replyAction} onClick={handleReply}>
          <Reply size={14} />
          Reply
        </button>
      )}

      {message.type === 'image' && message.metadata?.imageUrl && (
        <ImagePreviewModal
          open={imagePreviewOpen}
          images={[message.metadata.imageUrl]}
          currentIndex={0}
          onClose={() => setImagePreviewOpen(false)}
          onNext={() => {}}
          onPrev={() => {}}
        />
      )}
    </div>
  );
};
