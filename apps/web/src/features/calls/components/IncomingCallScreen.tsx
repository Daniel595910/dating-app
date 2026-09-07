import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { CallSession } from '../../types/call.types';
import styles from '../styles/IncomingCallScreen.module.css';

interface IncomingCallScreenProps {
  call: CallSession;
  callerName: string;
  callerAvatar: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  call,
  callerName,
  callerAvatar,
  onAccept,
  onDecline,
}) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.avatarContainer}>
          {callerAvatar ? (
            <img src={callerAvatar} alt={callerName} className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>{callerName.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <h2 className={styles.name}>{callerName}</h2>
        <p className={styles.status}>Incoming Voice Call...</p>
        <div className={styles.actions}>
          <button className={styles.declineButton} onClick={onDecline} aria-label="Decline call">
            <PhoneOff size={28} />
          </button>
          <button className={styles.acceptButton} onClick={onAccept} aria-label="Accept call">
            <Phone size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};
