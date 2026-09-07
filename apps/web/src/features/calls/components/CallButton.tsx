import React from 'react';
import { Phone } from 'lucide-react';
import styles from '../styles/CallButton.module.css';

interface CallButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const CallButton: React.FC<CallButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      className={styles.callButton}
      onClick={onClick}
      disabled={disabled}
      aria-label="Start voice call"
      title="Voice Call"
    >
      <Phone size={18} />
    </button>
  );
};
