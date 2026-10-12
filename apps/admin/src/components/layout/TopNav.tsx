import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import styles from './TopNav.module.css';

interface TopNavProps {
  onMenuClick?: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Users',
  '/communities': 'Communities',
  '/moderation': 'Moderation',
  '/comments': 'Comments',
  '/discover-videos': 'Discover Videos',
  '/reports': 'Reports',
  '/safety': 'Safety & Blocks',
  '/connections': 'Connections',
  '/matches': 'Matches',
  '/vip': 'VIP Management',
  '/payments': 'Payments',
  '/analytics': 'Analytics',
  '/audit-log': 'Audit Log',
  '/notifications': 'Notifications',
  '/admin-users': 'Admin Users',
  '/settings': 'Settings',
};

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, isSuperAdmin } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const currentLabel = ROUTE_LABELS[location.pathname] || 'Admin';
  const isRoot = location.pathname === '/';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/users?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className={styles.topNav}>
      <div className={styles.left}>
        <button className={styles.menuButton} onClick={onMenuClick} aria-label="Toggle menu">
          <Menu size={20} />
        </button>

        <div className={styles.breadcrumb}>
          <button className={styles.breadcrumbRoot} onClick={() => navigate('/')}>
            Admin
          </button>
          {!isRoot && (
            <>
              <ChevronRight size={14} className={styles.breadcrumbSeparator} />
              <span className={styles.breadcrumbCurrent}>{currentLabel}</span>
            </>
          )}
        </div>
      </div>

      <form className={styles.search} onSubmit={handleSearch}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search users, reports, communities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <kbd className={styles.searchShortcut}>? K</kbd>
      </form>

      <div className={styles.right}>
        <button className={styles.iconButton} aria-label="Notifications">
          <Bell size={18} />
          <span className={styles.notificationDot} />
        </button>

        <div className={styles.divider} />

        <button className={styles.userButton} onClick={() => navigate('/settings')}>
          <div className={styles.userAvatar}>
            {adminUser?.avatarUrl ? (
              <img src={adminUser.avatarUrl} alt={adminUser.displayName} />
            ) : (
              adminUser?.displayName?.charAt(0).toUpperCase() || 'A'
            )}
          </div>
          <div className={styles.userText}>
            <span className={styles.userName}>
              {adminUser?.displayName?.split(' ')[0] || 'Admin'}
            </span>
            <span className={styles.userRole}>
              {isSuperAdmin ? 'Super Admin' : adminUser?.role?.replace('_', ' ') || 'Admin'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
