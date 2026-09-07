import React from 'react';
import { ArrowLeft, MoreVertical, BadgeCheck, Phone, Search } from 'lucide-react';
import styles from '../styles/ChatHeader.module.css';

interface ChatHeaderProps {
  userName: string;
  userAvatar: string | null;
  verified: boolean;
  isOnline: boolean;
  onBack: () => void;
  onProfileClick: () => void;
  onMoreClick: () => void;
  onCallClick: () => void;
  onSearchClick?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  userName,
  userAvatar,
  verified,
  isOnline,
  onBack,
  onProfileClick,
  onMoreClick,
  onCallClick,
  onSearchClick,
}) => {
  return (
    <header className={styles.header}>
      <button className={styles.backButton} onClick={onBack} aria-label="Back">
        <ArrowLeft size={22} />
      </button>

      <button className={styles.profileSection} onClick={onProfileClick}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatar}>
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className={styles.avatarImage} />
            ) : (
              <span className={styles.avatarFallback}>{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {isOnline && <span className={styles.onlineDot} />}
        </div>

        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{userName}</span>
            {verified && <BadgeCheck size={15} className={styles.verifiedIcon} />}
          </div>
          <span className={`${styles.status} ${isOnline ? styles.online : styles.offline}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </button>

      <div className={styles.actions}>
        {onCallClick && (
          <button className={styles.actionButton} onClick={onCallClick} aria-label="Voice call" title="Voice Call">
            <Phone size={18} />
          </button>
        )}
        {onSearchClick && (
          <button className={styles.actionButton} onClick={onSearchClick} aria-label="Search in conversation">
            <Search size={18} />
          </button>
        )}
        <button className={styles.actionButton} onClick={onMoreClick} aria-label="More options">
          <MoreVertical size={20} />
        </button>
      </div>
    </header>
  );
};
