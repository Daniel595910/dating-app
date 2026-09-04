import React from 'react';
import { Search, MoreVertical, Users } from 'lucide-react';
import { CommunityInfo } from '../../types/community.types';
import { NotificationBell } from './NotificationBell';
import styles from '../styles/CommunityHeader.module.css';

interface CommunityHeaderProps {
  community: CommunityInfo;
  userId: string;
  onSearch: () => void;
  onMore: () => void;
}

export const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  community,
  userId,
  onSearch,
  onMore,
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            {community.flag} {community.name}
          </h1>
          <div className={styles.subtitleRow}>
            <Users size={12} />
            <span>{community.memberCount.toLocaleString()} members</span>
            <span>•</span>
            <span className={styles.onlineDot} />
            <span>{community.onlineCount} online</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <NotificationBell userId={userId} />
          <button className={styles.iconButton} onClick={onSearch} aria-label="Search">
            <Search size={20} />
          </button>
          <button className={styles.iconButton} onClick={onMore} aria-label="More options">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
