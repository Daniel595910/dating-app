import React from 'react';
import { Reply, Copy, Forward, Pencil, Trash2, Pin, Flag, X, Heart } from 'lucide-react';
import { ChatMessage } from '../../types/chat.types';
import styles from '../styles/MessageActionSheet.module.css';

interface MessageActionSheetProps {
  open: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  isOwn: boolean;
  onReply?: (message: ChatMessage) => void;
  onCopy?: (message: ChatMessage) => void;
  onForward?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onPin?: (message: ChatMessage) => void;
  onReport?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage, reaction: string) => void;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍'];

export const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  open,
  onClose,
  message,
  isOwn,
  onReply,
  onCopy,
  onForward,
  onEdit,
  onDelete,
  onPin,
  onReport,
  onReact,
}) => {
  if (!open || !message) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        {/* Quick Reactions */}
        <div className={styles.quickReactions}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={styles.reactionButton}
              onClick={() => { onReact?.(message, emoji); onClose(); }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Actions */}
        <div className={styles.actions}>
          {onReply && (
            <button className={styles.actionButton} onClick={() => { onReply(message); onClose(); }}>
              <Reply size={18} />
              <span>Reply</span>
            </button>
          )}
          {onCopy && (
            <button className={styles.actionButton} onClick={() => { onCopy(message); onClose(); }}>
              <Copy size={18} />
              <span>Copy</span>
            </button>
          )}
          {onForward && (
            <button className={styles.actionButton} onClick={() => { onForward(message); onClose(); }}>
              <Forward size={18} />
              <span>Forward</span>
            </button>
          )}
          {isOwn && onEdit && message.type === 'text' && (
            <button className={styles.actionButton} onClick={() => { onEdit(message); onClose(); }}>
              <Pencil size={18} />
              <span>Edit</span>
            </button>
          )}
          {onPin && (
            <button className={styles.actionButton} onClick={() => { onPin(message); onClose(); }}>
              <Pin size={18} />
              <span>Pin</span>
            </button>
          )}
          {isOwn && onDelete && (
            <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => { onDelete(message); onClose(); }}>
              <Trash2 size={18} />
              <span>Delete</span>
            </button>
          )}
          {!isOwn && onReport && (
            <button className={`${styles.actionButton} ${styles.reportButton}`} onClick={() => { onReport(message); onClose(); }}>
              <Flag size={18} />
              <span>Report</span>
            </button>
          )}
        </div>

        <div className={styles.divider} />

        {/* Cancel */}
        <button className={styles.cancelButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};
