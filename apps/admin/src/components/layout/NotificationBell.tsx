import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ShieldCheck,
  Flag,
  AlertTriangle,
  FileWarning,
  MessageSquare,
  MapPin,
  Ban,
  UserPlus,
  Crown,
  Video,
  DollarSign,
  KeyRound,
  Heart,
  MessageCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { adminAlertsService, AlertItem, AdminAlertsResult } from '@/services/admin-alerts.service';
import topNavStyles from './TopNav.module.css';
import styles from './NotificationBell.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck size={16} />,
  Flag: <Flag size={16} />,
  AlertTriangle: <AlertTriangle size={16} />,
  FileWarning: <FileWarning size={16} />,
  MessageSquare: <MessageSquare size={16} />,
  MapPin: <MapPin size={16} />,
  Ban: <Ban size={16} />,
  UserPlus: <UserPlus size={16} />,
  Crown: <Crown size={16} />,
  Video: <Video size={16} />,
  DollarSign: <DollarSign size={16} />,
  KeyRound: <KeyRound size={16} />,
  Heart: <Heart size={16} />,
  MessageCircle: <MessageCircle size={16} />,
};

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<AdminAlertsResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadAlerts = useCallback(async (showLoader: boolean) => {
    try {
      if (showLoader) setLoading(true);
      const result = await adminAlertsService.getAlerts();
      setAlerts(result);
    } catch (err: any) {
      toast.error('Failed to load alerts', err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAlerts(false);
    const interval = setInterval(() => loadAlerts(false), 30000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadAlerts(false);
  };

  const handleAlertClick = (item: AlertItem) => {
    navigate(item.route);
    setOpen(false);
  };

  const total = alerts ? alerts.total : 0;
  const hasItems = alerts ? alerts.items.length > 0 : false;
  const highItems = alerts ? alerts.items.filter((i) => i.priority === 'high') : [];
  const mediumItems = alerts ? alerts.items.filter((i) => i.priority === 'medium') : [];
  const infoItems = alerts ? alerts.items.filter((i) => i.priority === 'info') : [];

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={topNavStyles.iconButton}
        aria-label="Notifications"
        onClick={handleToggle}
        type="button"
      >
        <Bell size={18} />
        {total > 0 && <span className={styles.badge}>{total > 99 ? '99+' : total}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <div>
              <h3 className={styles.title}>Notifications</h3>
              <p className={styles.subtitle}>
                {loading ? 'Refreshing...' : (total > 0 ? total + ' alerts across the app' : 'All clear')}
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.iconBtn}
                onClick={() => loadAlerts(true)}
                disabled={loading}
                aria-label="Refresh"
                type="button"
              >
                <RefreshCw size={14} className={loading ? styles.spinning : undefined} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => setOpen(false)}
                aria-label="Close"
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className={styles.body}>
            {!hasItems && !loading && (
              <div className={styles.empty}>
                <Bell size={32} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>All clear</p>
                <p className={styles.emptyDesc}>No alerts requiring attention right now.</p>
              </div>
            )}

            {highItems.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupLabelHigh}>Needs attention</div>
                {highItems.map((item) => (
                  <button key={item.id} className={styles.row} onClick={() => handleAlertClick(item)} type="button">
                    <span className={styles.rowIconHigh}>{ICON_MAP[item.icon] || <Bell size={16} />}</span>
                    <span className={styles.rowCount}>{item.count}</span>
                    <span className={styles.rowLabel}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {mediumItems.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupLabelMedium}>Monitor</div>
                {mediumItems.map((item) => (
                  <button key={item.id} className={styles.row} onClick={() => handleAlertClick(item)} type="button">
                    <span className={styles.rowIconMedium}>{ICON_MAP[item.icon] || <Bell size={16} />}</span>
                    <span className={styles.rowCount}>{item.count}</span>
                    <span className={styles.rowLabel}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {infoItems.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupLabelInfo}>Activity</div>
                {infoItems.map((item) => (
                  <button key={item.id} className={styles.row} onClick={() => handleAlertClick(item)} type="button">
                    <span className={styles.rowIconInfo}>{ICON_MAP[item.icon] || <Bell size={16} />}</span>
                    <span className={styles.rowCount}>{item.count}</span>
                    <span className={styles.rowLabel}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasItems && (
            <div className={styles.footer}>
              <button
                className={styles.footerLink}
                onClick={() => { navigate('/notifications'); setOpen(false); }}
                type="button"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
