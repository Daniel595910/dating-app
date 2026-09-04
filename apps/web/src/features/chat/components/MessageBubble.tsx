import React from 'react';
import { Check, CheckCheck, AlertCircle, RotateCcw } from 'lucide-react';
import { ChatMessage } from '../../types/chat.types';
import styles from '../styles/MessageBubble.module.css';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSenderName?: boolean;
  onRetry?: (messageId: string, content: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showSenderName = false,
  onRetry,
}) => {
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

  return (
    <div className={`${styles.wrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}>
      <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble} ${isFailed ? styles.failedBubble : ''}`}>
        {!isOwn && showSenderName && (
          <span className={styles.senderName}>{message.senderName}</span>
        )}
        <p className={styles.content}>{message.content}</p>
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
          <button
            className={styles.retryButton}
            onClick={() => onRetry(message.id, message.content)}
          >
            <RotateCcw size={12} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
