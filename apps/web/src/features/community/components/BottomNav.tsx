import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, User, Heart, Plus, Video } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/BottomNav.module.css';

const CACHE_KEY = 'spensive:nav:profile';

interface NavProfile {
  avatarUrl: string | null;
  displayName: string;
}

export interface BottomNavFabConfig {
  icon: 'plus' | 'video';
  label: string;
  onClick: () => void;
}

interface BottomNavProps {
  fab?: BottomNavFabConfig;
}

export const BottomNav: React.FC<BottomNavProps> = ({ fab }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const cacheKey = user?.id ? `${CACHE_KEY}:${user.id}` : CACHE_KEY;

  const [navProfile, setNavProfile] = useState<NavProfile | null>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? (JSON.parse(cached) as NavProfile) : null;
    } catch {
      return null;
    }
  });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('avatar_url, display_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const fresh: NavProfile = {
          avatarUrl: data.avatar_url ?? null,
          displayName: data.display_name || 'You',
        };
        setNavProfile(fresh);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(fresh));
        } catch {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, cacheKey]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const fetchUnread = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('unread_counts')
        .contains('participant_ids', [user.id]);
      if (cancelled || !data) return;
      const total = data.reduce((sum, row) => {
        const v = (row.unread_counts as Record<string, number> | null)?.[user.id];
        return sum + (typeof v === 'number' ? v : 0);
      }, 0);
      setUnreadCount(total);
    };
    fetchUnread();
    const channel = supabase
      .channel('nav-unread:' + user.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        fetchUnread
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const items = [
    { id: 'community', label: 'Community', path: '/community', icon: Home },
    { id: 'discover', label: 'Discover', path: '/discover', icon: Heart },
    { id: 'chats', label: 'Chats', path: '/chats', icon: MessageCircle },
    { id: 'profile', label: 'Profile', path: '/profile', icon: User },
  ];

  const renderProfileVisual = (isActive: boolean) => {
    const ringClass = isActive ? ` ${styles.navAvatarActive}` : '';
    if (navProfile?.avatarUrl) {
      return (
        <img
          src={navProfile.avatarUrl}
          alt={navProfile.displayName}
          className={styles.navAvatar + ringClass}
        />
      );
    }
    const initial = (navProfile?.displayName || user?.email || '?').charAt(0).toUpperCase();
    return (
      <div className={styles.navAvatarFallback + ringClass}>
        {initial}
      </div>
    );
  };

  if (!fab) {
    return (
      <nav className={`${styles.bottomNav} ${location.pathname.startsWith('/discover') ? styles.bottomNavDiscover : ''}`} aria-label="Main navigation">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const isProfile = item.id === 'profile';
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.id === 'chats' && unreadCount > 0 && (
                <span className={styles.navBadge}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {isProfile ? renderProfileVisual(isActive) : <Icon size={22} />}
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  // FAB layout — 2 tabs | notch + FAB | 2 tabs
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);
  const isDiscover = location.pathname.startsWith('/discover');

  const renderNavItem = (item: typeof items[0]) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    const isProfile = item.id === 'profile';
    return (
      <button
        key={item.id}
        className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
        onClick={() => navigate(item.path)}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.id === 'chats' && unreadCount > 0 && (
          <span className={styles.navBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {isProfile ? renderProfileVisual(isActive) : <Icon size={22} />}
        <span className={styles.navLabel}>{item.label}</span>
      </button>
    );
  };

  return (
    <nav className={`${styles.bottomNav} ${styles.bottomNavWithFab} ${isDiscover ? styles.bottomNavDiscover : ''}`} aria-label="Main navigation">
      <div className={styles.navFabLeft}>
        {leftItems.map(renderNavItem)}
      </div>

      <div className={styles.navFabCenter}>
        <button
          type="button"
          className={styles.navFabButton}
          onClick={fab.onClick}
          aria-label={fab.label}
        >
          {fab.icon === 'plus' ? <Plus size={26} /> : <Video size={26} />}
        </button>
      </div>

      <div className={styles.navFabRight}>
        {rightItems.map(renderNavItem)}
      </div>
    </nav>
  );
};
