import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, Users, ChevronDown, Globe, Info, Flag, Compass, Star } from 'lucide-react';
import { CommunityInfo } from '../../types/community.types';
import { NotificationBell } from './NotificationBell';
import styles from '../styles/CommunityHeader.module.css';

interface CommunityHeaderProps {
  community: CommunityInfo;
  userId: string;
  onSearch: () => void;
  onMore: () => void;
  onSwitchCommunity?: () => void;
  onDiscover?: () => void;
  onCommunityInfo?: () => void;
  onReportCommunity?: () => void;
}

export const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  community,
  userId,
  onSearch,
  onMore,
  onSwitchCommunity,
  onDiscover,
  onCommunityInfo,
  onReportCommunity,
}) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  const hasCover = Boolean(community.coverImageUrl);

  return (
    <header
      className={styles.header}
      data-has-cover={hasCover ? 'true' : 'false'}
      style={hasCover ? { backgroundImage: `url(${community.coverImageUrl})` } : undefined}
    >
      <div className={styles.headerContent}>
        <div
          className={styles.headerLeft}
          onClick={onSwitchCommunity}
          style={{ cursor: onSwitchCommunity ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <h1 className={styles.title}>
              {community.flag} {community.name}
            </h1>
            {onSwitchCommunity && <ChevronDown size={16} style={{ color: hasCover ? "#ffffff" : "#9ca3af", flexShrink: 0 }} />}
          </div>
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

          {/* Three-dot menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className={styles.iconButton}
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              aria-label="More options"
              aria-expanded={moreMenuOpen}
            >
              <MoreVertical size={20} />
            </button>

            {moreMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 9999,
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  border: '1px solid #e5e7eb',
                  minWidth: 220,
                  padding: '6px',
                }}
              >
                {onDiscover && (
                  <button
                    onClick={() => { setMoreMenuOpen(false); onDiscover(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }}
                  >
                    <Compass size={16} />
                    Discover Communities
                  </button>
                )}
                {onCommunityInfo && (
                  <button
                    onClick={() => { setMoreMenuOpen(false); onCommunityInfo(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }}
                  >
                    <Info size={16} />
                    Community Info
                  </button>
                )}
                <button
                  onClick={() => { setMoreMenuOpen(false); window.location.href = '/community-guidelines'; }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }}
                >
                  <Globe size={16} />
                  Community Guidelines
                </button>
                {onReportCommunity && (
                  <button
                    onClick={() => { setMoreMenuOpen(false); onReportCommunity(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }}
                  >
                    <Flag size={16} />
                    Report Community
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

