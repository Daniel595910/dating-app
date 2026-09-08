import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { CallStatus } from '../../types/call.types';
import styles from '../styles/ActiveCallScreen.module.css';

interface ActiveCallScreenProps {
  userName: string;
  userAvatar: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  callState: CallStatus;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  userName,
  userAvatar,
  isMuted,
  onToggleMute,
  onEndCall,
  callState,
}) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    switch (callState) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Voice Call';
      case 'ended':
        return 'Call Ended';
      case 'declined':
        return 'Call Declined';
      case 'failed':
        return 'Call Failed';
      default:
        return 'Call';
    }
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
        <p className={styles.status}>{getStatusText()}</p>

        {callState === 'connected' && (
          <p className={styles.timer}>{formatDuration(duration)}</p>
        )}

        {callState === 'calling' && (
          <div className={styles.callingDots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )}

        <div className={styles.controls}>
          {callState === 'connected' && (
            <button className={styles.controlButton} onClick={onToggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          )}

          <button className={styles.endButton} onClick={onEndCall} aria-label="End call">
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};
