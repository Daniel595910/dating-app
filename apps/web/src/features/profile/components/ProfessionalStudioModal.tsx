import React, { useState } from 'react';
import { X, BarChart3, FileText, Image, Heart, Users, Wallet, Receipt } from 'lucide-react';
import { ProfileData, ProfileStats } from '../types/profile.types';
import styles from './ProfessionalStudioModal.module.css';

export type StudioTab =
  | 'overview'
  | 'content'
  | 'gallery'
  | 'favorites'
  | 'communities'
  | 'wallet'
  | 'transactions';

interface ProfessionalStudioModalProps {
  open: boolean;
  initialTab?: StudioTab;
  profile: ProfileData;
  stats: ProfileStats;
  onClose: () => void;
}

interface TabDef {
  id: StudioTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
  { id: 'content', label: 'Content', icon: <FileText size={16} /> },
  { id: 'gallery', label: 'Gallery', icon: <Image size={16} /> },
  { id: 'favorites', label: 'Favorites', icon: <Heart size={16} /> },
  { id: 'communities', label: 'Communities', icon: <Users size={16} /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet size={16} /> },
  { id: 'transactions', label: 'Transactions', icon: <Receipt size={16} /> },
];

function formatCount(n: number | undefined): string {
  const v = n ?? 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(v);
}

export const ProfessionalStudioModal: React.FC<ProfessionalStudioModalProps> = ({
  open,
  initialTab = 'overview',
  profile,
  stats,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);

  // Sync to initial tab when reopened
  React.useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  const renderOverview = () => (
    <div className={styles.tabContent}>
      <div className={styles.overviewHero}>
        <div className={styles.overviewGreeting}>
          Welcome back, <strong>{profile.displayName.split(' ')[0]}</strong>
        </div>
        <div className={styles.overviewSubtitle}>Your creator studio is where you manage your professional presence.</div>
      </div>

      <div className={styles.overviewGrid}>
        <div className={styles.overviewStat}>
          <span className={styles.overviewStatLabel}>Followers</span>
          <span className={styles.overviewStatValue}>{formatCount(stats.followers)}</span>
        </div>
        <div className={styles.overviewStat}>
          <span className={styles.overviewStatLabel}>Following</span>
          <span className={styles.overviewStatValue}>{formatCount(stats.following)}</span>
        </div>
        <div className={styles.overviewStat}>
          <span className={styles.overviewStatLabel}>Likes</span>
          <span className={styles.overviewStatValue}>{formatCount(stats.likes ?? 0)}</span>
        </div>
        <div className={styles.overviewStat}>
          <span className={styles.overviewStatLabel}>Posts</span>
          <span className={styles.overviewStatValue}>{formatCount(stats.posts)}</span>
        </div>
      </div>

      <div className={styles.overviewNote}>
        More studio features — content management, analytics, monetization, and advertising — are coming soon.
      </div>
    </div>
  );

  const renderPlaceholder = (title: string, description: string) => (
    <div className={styles.tabContent}>
      <div className={styles.placeholderCard}>
        <div className={styles.placeholderTitle}>{title}</div>
        <div className={styles.placeholderDesc}>{description}</div>
        <div className={styles.placeholderBadge}>Coming soon</div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'content':
        return renderPlaceholder('Content Manager', 'Manage all your posts, videos, and photos in one place.');
      case 'gallery':
        return renderPlaceholder('Gallery', 'Your photo gallery, curated for professional presentation.');
      case 'favorites':
        return renderPlaceholder('Favorites', 'Content you have saved and favorited.');
      case 'communities':
        return renderPlaceholder('My Communities', 'Communities you belong to or manage.');
      case 'wallet':
        return renderPlaceholder('Wallet', 'VIP points, community credits, and promotional balance.');
      case 'transactions':
        return renderPlaceholder('Transactions', 'Full history of your payments, points, and earnings.');
      default:
        return null;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerBadge}>👑 Pro Creator</span>
            <h2 className={styles.headerTitle}>Creator Studio</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close studio">
            <X size={22} />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            ))}
          </nav>

          <main className={styles.content}>{renderTabContent()}</main>
        </div>
      </div>
    </div>
  );
};
