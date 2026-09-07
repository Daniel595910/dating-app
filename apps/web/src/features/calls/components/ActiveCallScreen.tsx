import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import styles from '../styles/ActiveCallScreen.module.css';

interface ActiveCallScreenProps {
  userName: string;
  userAvatar: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  userName,
  userAvatar,
  isMuted,
  onToggleMute,
  onEndCall,
}) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.avatarContainer}>
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>{userName.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <h2 className={styles.name}>{userName}</h2>
        <p className={styles.status}>Voice Call</p>
        <p className={styles.timer}>{formatDuration(duration)}</p>
        <div className={styles.controls}>
          <button className={styles.controlButton} onClick={onToggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button className={styles.endButton} onClick={onEndCall} aria-label="End call">
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};
