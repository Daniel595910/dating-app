import React from 'react';
import { TrendingUp, Megaphone, Wallet, Link2, Gift, BadgeCheck } from 'lucide-react';
import styles from './ProfessionalMarketingShortcuts.module.css';

export type ShortcutTarget = 'analytics' | 'promote' | 'monetization' | 'link' | 'rewards' | 'tools';

interface ProfessionalMarketingShortcutsProps {
  onOpen: (target: ShortcutTarget) => void;
}

interface Shortcut {
  target: ShortcutTarget;
  label: string;
  icon: React.ReactNode;
  bgClass: string | undefined;
  iconColor: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    target: 'analytics',
    label: 'Analytics',
    icon: <TrendingUp size={22} />,
    bgClass: styles.shortcutAnalytics,
    iconColor: 'var(--color-primary)',
  },
  {
    target: 'promote',
    label: 'Promote Post',
    icon: <Megaphone size={22} />,
    bgClass: styles.shortcutPromote,
    iconColor: 'var(--color-primary)',
  },
  {
    target: 'monetization',
    label: 'Monetization',
    icon: <Wallet size={22} />,
    bgClass: styles.shortcutMonetization,
    iconColor: 'var(--color-info)',
  },
  {
    target: 'link',
    label: 'Link in Bio',
    icon: <Link2 size={22} />,
    bgClass: styles.shortcutLink,
    iconColor: 'var(--color-info)',
  },
  {
    target: 'rewards',
    label: 'Rewards',
    icon: <Gift size={22} />,
    bgClass: styles.shortcutRewards,
    iconColor: 'var(--color-primary)',
  },
  {
    target: 'tools',
    label: 'Creator Tools',
    icon: <BadgeCheck size={22} />,
    bgClass: styles.shortcutTools,
    iconColor: 'var(--color-info)',
  },
];

export const ProfessionalMarketingShortcuts: React.FC<ProfessionalMarketingShortcutsProps> = ({ onOpen }) => {
  return (
    <div className={styles.scroller}>
      <div className={styles.row}>
        {SHORTCUTS.map((s) => (
          <button
            key={s.target}
            type="button"
            className={styles.shortcut}
            onClick={() => onOpen(s.target)}
          >
            <span className={`${styles.iconWrap} ${s.bgClass}`} style={{ color: s.iconColor }}>
              {s.icon}
            </span>
            <span className={styles.label}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
