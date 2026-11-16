import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Cake, RefreshCw, Bell, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { notificationService } from '@/services/notification.service';
import styles from './BirthdaysPage.module.css';

type BirthdayRow = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  birthDate: string;
  ageTurning: number | null;
  notificationSent: boolean;
  notificationId: string | null;
  sentAt: string | null;
  readAt: string | null;
};

type RecentSent = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  read_at?: string | null;
  user?: { display_name: string; avatar_url: string | null };
};

type Stats = {
  birthdaysToday: number;
  sentToday: number;
  sentThisYear: number;
  unread: number;
};

const timeAgo = (iso: string): string => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const BirthdaysPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday] = useState<BirthdayRow[]>([]);
  const [recentSent, setRecentSent] = useState<RecentSent[]>([]);
  const [stats, setStats] = useState<Stats>({
    birthdaysToday: 0,
    sentToday: 0,
    sentThisYear: 0,
    unread: 0,
  });

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await notificationService.getBirthdayMonitor();
      setToday(data.today);
      setRecentSent(data.recentSent as RecentSent[]);
      setStats(data.stats);
    } catch (err: any) {
      toast.error('Failed to load birthdays', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    toast.success('Refreshed');
  };

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Birthdays</h1>
          <p className={styles.subtitle}>
            Monitor today's birthdays and birthday notification delivery (UTC)
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Cake size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Birthdays Today</p>
            <p className={styles.statValue}>{stats.birthdaysToday.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Sent Today</p>
            <p className={styles.statValue}>{stats.sentToday.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Gift size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Sent This Year</p>
            <p className={styles.statValue}>{stats.sentThisYear.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Bell size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Unread</p>
            <p className={styles.statValue}>{stats.unread.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Today's Birthdays */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Cake size={16} /> Today's Birthdays
          </h2>
          <Badge variant="default" size="sm">{today.length}</Badge>
        </div>

        {loading ? (
          <Loader text="Loading birthdays..." />
        ) : today.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={<Cake size={32} />}
              title="No birthdays today"
              description="Users whose birthday is today (UTC) will appear here."
            />
          </div>
        ) : (
          <div className={styles.birthdayList}>
            {today.map((row) => (
              <div
                key={row.userId}
                className={styles.birthdayCard}
                onClick={() => handleUserClick(row.userId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUserClick(row.userId);
                }}
              >
                <Avatar src={row.avatarUrl} name={row.displayName} size="md" />
                <div className={styles.birthdayInfo}>
                  <p className={styles.birthdayName}>
                    {row.displayName}
                    {row.ageTurning !== null && (
                      <span className={styles.birthdayAge}>turning {row.ageTurning}</span>
                    )}
                  </p>
                  <p className={styles.birthdayMeta}>Born {row.birthDate}</p>
                </div>
                <div className={styles.birthdayStatus}>
                  {row.notificationSent ? (
                    <>
                      <Badge variant="success" size="sm">
                        <CheckCircle size={11} /> Sent
                      </Badge>
                      <span className={styles.statusTime}>
                        <Clock size={11} /> {timeAgo(row.sentAt || '')}
                      </span>
                      {row.readAt && (
                        <span className={styles.statusRead}>Read</span>
                      )}
                    </>
                  ) : (
                    <Badge variant="warning" size="sm">
                      <AlertCircle size={11} /> Not sent
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Sent */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Gift size={16} /> Recent Birthday Notifications
          </h2>
          <Badge variant="default" size="sm">{recentSent.length}</Badge>
        </div>

        {loading ? (
          <Loader text="Loading..." />
        ) : recentSent.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={<Gift size={32} />}
              title="No birthday notifications sent yet"
              description="Birthday notifications sent by the daily cron will appear here."
            />
          </div>
        ) : (
          <div className={styles.recentList}>
            {recentSent.map((n) => (
              <div key={n.id} className={styles.recentCard}>
                <div className={styles.recentIndicator} />
                <div className={styles.recentContent}>
                  <div className={styles.recentHeader}>
                    <Badge
                      variant={n.status === 'unread' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {n.status}
                    </Badge>
                    <span className={styles.recentTime}>
                      <Clock size={11} /> {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <h3 className={styles.recentTitle}>{n.title}</h3>
                  <p className={styles.recentBody}>{n.body}</p>
                  {n.user && (
                    <div className={styles.recentUser}>
                      <Avatar src={n.user.avatar_url} name={n.user.display_name} size="xs" />
                      <span>To: {n.user.display_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
