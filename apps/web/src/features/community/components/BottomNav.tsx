import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, User } from 'lucide-react';
import styles from '../styles/BottomNav.module.css';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { id: 'community', label: 'Community', path: '/community', icon: Home },
    { id: 'chats', label: 'Chats', path: '/chats', icon: MessageCircle },
    { id: 'profile', label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className={styles.bottomNav} aria-label="Main navigation">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={24} />
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
