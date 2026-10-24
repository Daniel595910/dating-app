import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Shield,
  Heart,
  Crown,
  Flag,
  BarChart3,
  Settings,
  ScrollText,
  LogOut,
  ShieldCheck,
  Bell,
  UserX,
  MessageSquare,
  Video,
  UserPlus,
  DollarSign,
  Smile,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { APP_NAME, APP_VERSION } from '@/config/constants';
import styles from './Sidebar.module.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/users', label: 'Users', icon: <Users size={18} />, permission: 'USER_VIEW' },
  { path: '/communities', label: 'Communities', icon: <UsersRound size={18} />, permission: 'COMMUNITY_VIEW' },
  { path: '/moderation', label: 'Moderation', icon: <Shield size={18} />, permission: 'CONTENT_VIEW' },
  { path: '/comments', label: 'Comments', icon: <MessageSquare size={18} />, permission: 'CONTENT_VIEW' },
  { path: '/stickers', label: 'Stickers & GIFs', icon: <Smile size={18} />, permission: 'CONTENT_VIEW' },
  { path: '/discover-videos', label: 'Discover Videos', icon: <Video size={18} />, permission: 'CONTENT_VIEW' },
  { path: '/reports', label: 'Reports', icon: <Flag size={18} />, permission: 'CONTENT_VIEW' },
  { path: '/safety', label: 'Safety', icon: <UserX size={18} />, permission: 'USER_VIEW' },
  { path: '/verifications', label: 'Verifications', icon: <ShieldCheck size={18} />, permission: 'USER_VERIFY' },
  { path: '/connections', label: 'Connections', icon: <UserPlus size={18} />, permission: 'USER_VIEW' },
  { path: '/matches', label: 'Matches', icon: <Heart size={18} /> },
  { path: '/vip', label: 'VIP', icon: <Crown size={18} />, permission: 'VIP_VIEW' },
  { path: '/payments', label: 'Payments', icon: <DollarSign size={18} />, permission: 'VIP_VIEW' },
  { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} />, permission: 'ANALYTICS_VIEW' },
  { path: '/audit-log', label: 'Audit Log', icon: <ScrollText size={18} />, permission: 'AUDIT_VIEW' },
  { path: '/notifications', label: 'Notifications', icon: <Bell size={18} />, permission: 'SETTINGS_VIEW' },
  { path: '/notification-settings', label: 'Notif. Settings', icon: <Settings size={18} />, permission: 'SETTINGS_VIEW' },
  { path: '/admin-users', label: 'Admin Users', icon: <ShieldCheck size={18} />, permission: 'ADMIN_MANAGE' },
  { path: '/settings', label: 'Settings', icon: <Settings size={18} />, permission: 'SETTINGS_VIEW' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { adminUser, hasPermission, signOut } = useAdminAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>SG</div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>{APP_NAME}</span>
          <span className={styles.logoVersion}>v{APP_VERSION}</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
            end={item.path === '/'}
            onClick={handleNavClick}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {adminUser?.avatarUrl ? (
              <img
                src={adminUser.avatarUrl}
                alt={adminUser.displayName || 'Admin'}
                loading="lazy"
              />
            ) : (
              adminUser?.displayName?.charAt(0).toUpperCase() || 'A'
            )}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{adminUser?.displayName || 'Admin'}</span>
            <span className={styles.userRole}>{adminUser?.role?.replace('_', ' ') || ''}</span>
          </div>
        </div>
        <button className={styles.logoutButton} onClick={signOut} title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
