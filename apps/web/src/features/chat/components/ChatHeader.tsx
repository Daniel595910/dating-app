import React from 'react';
import { ArrowLeft, MoreVertical, BadgeCheck, Phone, Video, Search } from 'lucide-react';
import styles from '../styles/ChatHeader.module.css';

interface ChatHeaderProps {
  userName: string;
  userAvatar: string | null;
  verified: boolean;
  isOnline: boolean;
  lastSeen?: string | null;
  isTyping?: boolean;
  onBack: () => void;
  onProfileClick: () => void;
  onMoreClick: () => void;
  onCallClick: () => void;
  onVideoCallClick?: () => void;
  onSearchClick?: () => void;
}

const formatLastSeen = (iso: string | null | undefined): string => {
  if (!iso) return 'Offline';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Offline';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'Last seen just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return 'Last seen ' + mins + ' min ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return 'Last seen ' + hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 7) return 'Last seen ' + days + 'd ago';
  return 'Last seen ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  userName,
  userAvatar,
  verified,
  isOnline,
  lastSeen,
  isTyping,
  onBack,
  onProfileClick,
  onMoreClick,
  onCallClick,
  onVideoCallClick,
  onSearchClick,
}) => {
  return (
    <header className={styles.header}>
      {/* Back Button */}
      <button className={styles.backButton} onClick={onBack} aria-label="Back">
        <ArrowLeft size={22} />
      </button>

      {/* Profile Section */}
      <button className={styles.profileSection} onClick={onProfileClick}>
        <div className={styles.avatarWrapper}>
          <div className={`${styles.avatar} ${isOnline ? styles.avatarOnline : ''}`}>
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className={styles.avatarImage} />
            ) : (
              <span className={styles.avatarFallback}>{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {isOnline && (
            <span className={styles.onlineDot} />
          )}
        </div>

        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{userName}</span>
            {verified && (
              <span className={styles.verifiedBadge}>
                <BadgeCheck size={14} />
              </span>
            )}
          </div>
          <span className={`${styles.status} ${isOnline ? styles.statusOnline : styles.statusOffline}`}>
            {isTyping ? 'Typing...' : isOnline ? 'Active now' : formatLastSeen(lastSeen)}
          </span>
        </div>
      </button>

      {/* Action Buttons */}
      <div className={styles.actions}>
        {onVideoCallClick && (
          <button className={styles.actionButton} onClick={onVideoCallClick} aria-label="Video call" title="Video Call">
            <Video size={20} />
          </button>
        )}
        {onCallClick && (
          <button className={styles.actionButton} onClick={onCallClick} aria-label="Voice call" title="Voice Call">
            <Phone size={20} />
          </button>
        )}
        {onSearchClick && (
          <button className={styles.actionButton} onClick={onSearchClick} aria-label="Search" title="Search">
            <Search size={20} />
          </button>
        )}
        <button className={`${styles.actionButton} ${styles.moreButton}`} onClick={onMoreClick} aria-label="More options" title="More">
          <MoreVertical size={20} />
        </button>
      </div>
    </header>
  );
};

