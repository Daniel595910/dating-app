import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, Users, ChevronDown, Globe, Info, Flag, Compass, Star, Handshake, Plus, UserRoundPlus } from 'lucide-react';
import { CommunityInfo } from '../../types/community.types';
import { NotificationBell } from './NotificationBell';
 import { AvatarStack } from './AvatarStack';
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
  memberPreview?: Array<{ userId: string; name: string; avatarUrl: string | null }>;
  memberPreviewCommunityId?: string | null;
  onOpenMembers?: () => void;
  connectionCount?: number;
  onOpenConnections?: () => void;
  storyRingState?: Record<string, 'unseen' | 'seen'>;
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
  memberPreview = [],
  memberPreviewCommunityId = null,
  onOpenMembers,
  connectionCount = 0,
  onOpenConnections,
  storyRingState = {},
}) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
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
          {/* Top Row: Logo + Title */}
          <div className={styles.topRow}>
            <div className={styles.flagContainer}>
              {community.avatarUrl ? (
                <img src={community.avatarUrl} alt={community.name} className={styles.logoImage} />
              ) : (
                <span>{community.flag}</span>
              )}
            </div>

            <div className={styles.titleRow}>
              <h1 className={styles.title}>{community.name}</h1>
              {community.isFeatured && (
                <span
                  title="Featured community"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.1875rem',
                    padding: '0.1875rem 0.5rem',
                    marginRight: '0.375rem',
                    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                    color: '#92400e',
                    borderRadius: '9999px',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    lineHeight: 1,
                    flexShrink: 0,
                    border: '1px solid #fcd34d',
                  }}
                >
                  <Star size={10} fill="currentColor" />
                  Featured
                </span>
              )}
              {onSwitchCommunity && <ChevronDown size={16} style={{ color: hasCover ? "#ffffff" : "#9ca3af", flexShrink: 0 }} />}
            </div>
          </div>
          {/* Bottom Row: Subtitle (aligned under logo) */}
          <div className={styles.subtitleRow}>
            <div className={styles.membersText}>
              <Users size={12} />
              <span>{community.memberCount.toLocaleString()} members</span>
              <span className={styles.bullet}>•</span>
            </div>
            <div className={styles.onlineText}>
              <span className={styles.onlineDot} />
              <span>{community.onlineCount} online</span>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.avatarStackContainer}>
            {memberPreview.length > 0 && memberPreviewCommunityId === community.id ? (
              <AvatarStack
                members={memberPreview}
                totalCount={community.memberCount}
                maxVisible={1}
                onClick={onOpenMembers}
                ringState={storyRingState}
              />
            ) : (
              <button
                type="button"
                className={styles.emptyAvatarPlaceholder}
                onClick={onOpenMembers}
                aria-label="View members"
              >
                <UserRoundPlus size={14} />
              </button>
            )}
          </div>

          <div className={styles.headerActions}>
            <NotificationBell userId={userId} buttonClassName={styles.iconButton} />
            {onOpenConnections && (
              <button
                className={styles.iconButton}
                onClick={onOpenConnections}
                aria-label="Connections"
                style={{ position: 'relative' }}
              >
                <Handshake size={18} />
                {connectionCount > 0 && (
                  <span className={styles.actionBadge}>
                    {connectionCount > 99 ? '99+' : connectionCount}
                  </span>
                )}
              </button>
            )}
            <button className={styles.iconButton} onClick={onSearch} aria-label="Search">
              <Search size={18} />
            </button>

            {/* Three-dot menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                className={styles.iconButton}
                onClick={() => setMoreMenuOpen((prev) => !prev)}
                aria-label="More options"
                aria-expanded={moreMenuOpen}
              >
                <MoreVertical size={18} />
              </button>

              {moreMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 9999,
                    backgroundColor: 'var(--color-surface-raised, #ffffff)',
                    borderRadius: 14,
                    boxShadow: '0 12px 40px color-mix(in srgb, var(--color-text, #111827) 12%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-text, #111827) 3%, transparent)',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    minWidth: 220,
                    padding: 6,
                    animation: 'communityMenuFadeIn 0.14s ease-out',
                    overflow: 'hidden',
                  }}
                >
                  <style>{`
                    @keyframes communityMenuFadeIn {
                      from { opacity: 0; transform: translateY(-4px) scale(0.98); }
                      to   { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .community-menu-item {
                      display: flex;
                      align-items: center;
                      gap: 10px;
                      width: 100%;
                      padding: 10px 12px;
                      background: none;
                      border: none;
                      cursor: pointer;
                      color: var(--color-text, #111827);
                      font-size: 14px;
                      font-weight: 500;
                      border-radius: 8px;
                      text-align: left;
                      transition: background-color 0.12s ease, color 0.12s ease;
                    }
                    .community-menu-item:hover {
                      background-color: var(--color-surface-alt, #f9fafb);
                    }
                    .community-menu-item.danger {
                      color: var(--color-danger, #ef4444);
                    }
                    .community-menu-item.danger:hover {
                      background-color: var(--color-primary-soft, #fef2f2);
                    }
                  `}</style>
                  {onDiscover && (
                    <button
                      className="community-menu-item"
                      onClick={() => { setMoreMenuOpen(false); onDiscover(); }}
                    >
                      <Compass size={16} />
                      Discover Communities
                    </button>
                  )}
                  {onCommunityInfo && (
                    <button
                      className="community-menu-item"
                      onClick={() => { setMoreMenuOpen(false); onCommunityInfo(); }}
                    >
                      <Info size={16} />
                      Community Info
                    </button>
                  )}
                  <button
                    className="community-menu-item"
                    onClick={() => { setMoreMenuOpen(false); window.location.href = '/community-guidelines'; }}
                  >
                    <Globe size={16} />
                    Community Guidelines
                  </button>
                  {onReportCommunity && (
                    <button
                      className="community-menu-item danger"
                      onClick={() => { setMoreMenuOpen(false); onReportCommunity(); }}
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
      </div>
    </header>
  );
};
