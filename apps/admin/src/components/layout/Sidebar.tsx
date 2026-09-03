import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/users', label: 'Users', icon: 'users' },
  { path: '/communities', label: 'Communities', icon: 'communities' },
  { path: '/moderation', label: 'Moderation', icon: 'moderation' },
  { path: '/matches', label: 'Matches', icon: 'matches' },
  { path: '/vip', label: 'VIP', icon: 'vip' },
  { path: '/reports', label: 'Reports', icon: 'reports' },
  { path: '/analytics', label: 'Analytics', icon: 'analytics' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1 className={styles.logoText}>Dating App Admin</h1>
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
            end={item.path === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};