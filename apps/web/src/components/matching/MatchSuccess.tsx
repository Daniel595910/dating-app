/**
 * MatchSuccess Component
 * Celebration modal for successful matches
 */

import React from 'react';
import { Modal, Button } from '@dating-app/ui';
import styles from './MatchSuccess.module.css';

interface MatchSuccessProps {
  open: boolean;
  onClose: () => void;
  matchedUserName: string;
  onStartChat?: () => void;
}

export const MatchSuccess: React.FC<MatchSuccessProps> = ({
  open,
  onClose,
  matchedUserName,
  onStartChat,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Keep Browsing
          </Button>
          {onStartChat && (
            <Button onClick={onStartChat}>
              Start Chat
            </Button>
          )}
        </>
      }
    >
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="#ef4444"
            stroke="#ef4444"
            strokeWidth="1"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <h2 className={styles.title}>It's a Match!</h2>
        <p className={styles.message}>
          You and {matchedUserName} liked each other. Start a conversation now!
        </p>
      </div>
    </Modal>
  );
};