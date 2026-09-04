import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { ChatMessage } from '../../types/chat.types';
import styles from '../styles/MessageBubble.module.css';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSenderName?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showSenderName = false }) => {
  return (
    <div className={`${styles.wrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}>
      <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`}>
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
              {message.status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
