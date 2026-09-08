import React from 'react';
import { Mic, X, AlertTriangle } from 'lucide-react';
import styles from '../styles/MicrophonePermissionModal.module.css';

interface MicrophonePermissionModalProps {
  open: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<void>;
  permissionState: 'unknown' | 'granted' | 'denied' | 'prompt';
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  open,
  onClose,
  onRequestPermission,
  permissionState,
}) => {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconContainer}>
          <Mic size={32} className={styles.micIcon} />
        </div>

        <h2 className={styles.title}>Microphone Access Required</h2>
        
        <p className={styles.description}>
          Voice calls require access to your microphone to work.
        </p>

        {permissionState === 'denied' && (
          <div className={styles.warning}>
            <AlertTriangle size={16} />
            <span>
              Microphone is blocked in your browser settings. Click the lock icon in your address bar and allow microphone access.
            </span>
          </div>
        )}

        <div className={styles.steps}>
          <h3 className={styles.stepsTitle}>How to enable:</h3>
          <ol className={styles.stepsList}>
            <li>Look for the microphone icon in your browser's address bar</li>
            <li>Click it and select "Allow"</li>
            <li>If blocked, go to browser settings → Privacy → Microphone</li>
            <li>Refresh the page after enabling</li>
          </ol>
        </div>

        <div className={styles.actions}>
          <button className={styles.requestButton} onClick={onRequestPermission}>
            <Mic size={18} />
            Allow Microphone
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
