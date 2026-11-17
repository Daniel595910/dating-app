import React from 'react';
import { ArrowLeft, Share2, Settings, MoreVertical, BadgeCheck, MapPin, Link2, ChevronRight, Pencil } from 'lucide-react';
import { ProfileData, ProfileStats } from '../types/profile.types';
import styles from './ProfessionalProfileHeader.module.css';

interface ProfessionalProfileHeaderProps {
  profile: ProfileData;
  stats: ProfileStats;
  isOwnProfile: boolean;
  onBack: () => void;
  onShare: () => void;
  onSettings: () => void;
  onMoreMenu?: () => void;
  onEditProfile: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onOpenLikes: () => void;
}

function formatCount(n: number | undefined): string {
  const v = n ?? 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(v);
}

export const ProfessionalProfileHeader: React.FC<ProfessionalProfileHeaderProps> = ({
  profile,
  stats,
  isOwnProfile,
  onBack,
  onShare,
  onSettings,
  onMoreMenu,
  onEditProfile,
  onOpenFollowers,
  onOpenFollowing,
  onOpenLikes,
}) => {
  const locationText = profile.location
    ? [profile.location.city, profile.location.state, profile.location.country].filter(Boolean).join(', ')
    : '';

  const hasLinkInBio = Boolean(profile.linkInBioUrl);
  const likesValue = stats.likes ?? 0;

  return (
    <div className={styles.container}>
      <div className={styles.gradientBg} aria-hidden="true" />

      <header className={styles.topBar}>
        <button className={styles.iconBtn} onClick={onBack} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <span className={styles.topBarTitle}>{profile.displayName}</span>
        {isOwnProfile ? (
          <div className={styles.topBarActions}>
            <button className={styles.iconBtn} onClick={onShare} aria-label="Share profile">
              <Share2 size={22} />
            </button>
            <button className={styles.iconBtn} onClick={onSettings} aria-label="Settings">
              <Settings size={23} />
            </button>
          </div>
        ) : (
          <button className={styles.iconBtn} onClick={onMoreMenu} aria-label="More">
            <MoreVertical size={22} />
          </button>
        )}
      </header>

      <div className={styles.profileRow}>
        <div className={styles.avatarColumn}>
          <div className={styles.avatarRing}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>{profile.displayName.charAt(0).toUpperCase()}</div>
            )}
            {profile.isVerified && (
              <BadgeCheck size={26} className={styles.avatarVerified} />
            )}
          </div>
          <div className={styles.proBadge}>
            <span className={styles.proBadgeCrown}>👑</span>
            <span className={styles.proBadgeText}>Pro Creator</span>
          </div>
        </div>

        <div className={styles.infoColumn}>
          <div className={styles.nameRow}>
            <h1 className={styles.displayName}>{profile.displayName}</h1>
            {profile.isVerified && <BadgeCheck size={20} className={styles.nameVerified} />}
          </div>
          <p className={styles.username}>@{profile.username}</p>
          {locationText && (
            <div className={styles.locationRow}>
              <MapPin size={13} />
              <span>{locationText}</span>
            </div>
          )}
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          {hasLinkInBio && (
            <a
              href={profile.linkInBioUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkInBio}
            >
              <Link2 size={14} />
              <span className={styles.linkText}>{profile.linkInBioUrl}</span>
              <ChevronRight size={14} className={styles.linkArrow} />
            </a>
          )}
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statsLeft}>
          <button className={styles.statItem} onClick={onOpenFollowers}>
            <span className={styles.statValue}>{formatCount(stats.followers)}</span>
            <span className={styles.statLabel}>Followers</span>
          </button>
          <button className={styles.statItem} onClick={onOpenFollowing}>
            <span className={styles.statValue}>{formatCount(stats.following)}</span>
            <span className={styles.statLabel}>Following</span>
          </button>
          <button className={styles.statItem} onClick={onOpenLikes}>
            <span className={styles.statValue}>{formatCount(likesValue)}</span>
            <span className={styles.statLabel}>Likes</span>
          </button>
        </div>
        {isOwnProfile && (
          <button className={styles.editBtn} onClick={onEditProfile}>
            <Pencil size={14} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>
    </div>
  );
};
