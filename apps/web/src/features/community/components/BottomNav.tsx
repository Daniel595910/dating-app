import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, User, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/BottomNav.module.css';

const CACHE_KEY = 'spensive:nav:profile';

interface NavProfile {
  avatarUrl: string | null;
  displayName: string;
}

export const BottomNav: React.FC = () => {
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

  return (
    <nav className={styles.bottomNav} aria-label="Main navigation">
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
            {isProfile ? renderProfileVisual(isActive) : <Icon size={22} />}
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};