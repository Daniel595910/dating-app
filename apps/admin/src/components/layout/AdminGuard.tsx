import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import styles from './AdminGuard.module.css';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, requiredPermissions }) => {
  const { user, isAdmin, loading, hasAnyPermission } = useAdminAuth();

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Verifying access...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className={styles.denied}>
        <div className={styles.deniedIcon}>🔒</div>
        <h2 className={styles.deniedTitle}>Access Denied</h2>
        <p className={styles.deniedText}>
          You don't have permission to access the admin panel.
        </p>
        <p className={styles.deniedHint}>
          Required role: Administrator or higher
        </p>
      </div>
    );
  }

  if (requiredPermissions && requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
    return (
      <div className={styles.denied}>
        <div className={styles.deniedIcon}>🔒</div>
        <h2 className={styles.deniedTitle}>Insufficient Permissions</h2>
        <p className={styles.deniedText}>
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
