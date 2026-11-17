import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Heart,
  Flag,
  UsersRound,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Crown,
  Shield,
  Activity,
  Clock,
} from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { adminUsersService } from '@/services/adminUsers.service';
import styles from './DashboardPage.module.css';

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  totalPosts: number;
  postsToday: number;
  totalMatches: number;
  matchesToday: number;
  pendingReports: number;
  totalCommunities: number;
  activeUsers: number;
  vipUsers: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'post' | 'report' | 'match';
  title: string;
  subtitle: string;
  timestamp: string;
}

async function safeCount(table: string, filters?: (q: any) => any): Promise<number> {
  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filters) query = filters(query);
    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminUser, hasPermission } = useAdminAuth();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersToday: 0,
    totalPosts: 0,
    postsToday: 0,
    totalMatches: 0,
    matchesToday: 0,
    pendingReports: 0,
    totalCommunities: 0,
    activeUsers: 0,
    vipUsers: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myStats, setMyStats] = useState({ total: 0, today: 0, week: 0 });
  const [myActivity, setMyActivity] = useState<{ action: string; resource_type: string; created_at: string }[]>([]);
  const [myActivityLoading, setMyActivityLoading] = useState(true);

  useEffect(() => {
    if (!adminUser?.userId) { setMyActivityLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [s, a] = await Promise.all([
          adminUsersService.getAdminStats(adminUser.userId),
          adminUsersService.getAdminActivity(adminUser.userId, 5),
        ]);
        if (!cancelled) { setMyStats(s); setMyActivity(a as any); }
      } catch (e) {
        if (!cancelled) console.error("Failed to load personal activity:", e);
      } finally {
        if (!cancelled) setMyActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adminUser?.userId]);

  const loadStats = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      totalUsers, newUsersToday,
      totalPosts, postsToday,
      totalMatches, matchesToday,
      pendingReports, totalCommunities,
      activeUsers, vipUsers,
    ] = await Promise.all([
      safeCount('profiles'),
      safeCount('profiles', (q) => q.gte('created_at', todayStart)),
      safeCount('posts'),
      safeCount('posts', (q) => q.gte('created_at', todayStart)),
      safeCount('matches'),
      safeCount('matches', (q) => q.gte('created_at', todayStart)),
      safeCount('reports', (q) => q.eq('status', 'pending')),
      safeCount('communities'),
      safeCount('presence', (q) => q.eq('is_online', true)),
      safeCount('profiles', (q) => q.eq('is_vip', true)),
    ]);

    setStats({
      totalUsers, newUsersToday,
      totalPosts, postsToday,
      totalMatches, matchesToday,
      pendingReports, totalCommunities,
      activeUsers, vipUsers,
    });
  };

  const loadRecentActivity = async () => {
    const items: RecentActivity[] = [];

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      (data || []).forEach((u: any) => {
        items.push({
          id: `user-${u.id}`,
          type: 'user',
          title: u.display_name || 'New user',
          subtitle: 'Joined the platform',
          timestamp: u.created_at,
        });
      });
    } catch {}

    // Skip reports for now - table has issues
    // try {
    //   const { data } = await supabase
    //     .from('reports')
    //     .select('id, created_at, status')
    //     .order('created_at', { ascending: false })
    //     .limit(5);
    //   ...
    // } catch {}

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(items.slice(0, 8));
  };

  const loadDashboard = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadRecentActivity()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadRecentActivity()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const primaryStats = [
    { label: 'Total Users', value: stats.totalUsers, change: stats.newUsersToday, changeLabel: 'today', icon: <Users size={20} />, color: 'blue', path: '/users', permission: 'USER_VIEW' },
    { label: 'Total Posts', value: stats.totalPosts, change: stats.postsToday, changeLabel: 'today', icon: <FileText size={20} />, color: 'purple', path: '/moderation', permission: 'CONTENT_VIEW' },
    { label: 'Total Matches', value: stats.totalMatches, change: stats.matchesToday, changeLabel: 'today', icon: <Heart size={20} />, color: 'pink', path: '/matches' },
    { label: 'Pending Reports', value: stats.pendingReports, change: 0, changeLabel: 'needs review', icon: <Flag size={20} />, color: 'red', path: '/reports', urgent: stats.pendingReports > 0, permission: 'CONTENT_VIEW' },
  ];

  const secondaryStats = [
    { label: 'Communities', value: stats.totalCommunities, icon: <UsersRound size={16} />, path: '/communities', permission: 'COMMUNITY_VIEW' },
    { label: 'Active Now', value: stats.activeUsers, icon: <Activity size={16} /> },
    { label: 'VIP Users', value: stats.vipUsers, icon: <Crown size={16} />, path: '/vip', permission: 'VIP_VIEW' },
  ];

  const visiblePrimary = primaryStats.filter((s: any) => !s.permission || hasPermission(s.permission));
  const visibleSecondary = secondaryStats.filter((s: any) => !s.permission || hasPermission(s.permission));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Welcome back, {adminUser?.displayName?.split(' ')[0] || 'Admin'}
          </h1>
          <p className={styles.subtitle}>Here's what's happening on your platform</p>
        </div>
        <button className={styles.refreshButton} onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {!myActivityLoading && (
        <div className={styles.yourActivity}>
          <div className={styles.yourActivityHeader}>
            <h2 className={styles.yourActivityTitle}>
              <Activity size={16} /> Your Activity
            </h2>
            <span className={styles.yourActivitySubtitle}>Your admin actions, not the platform-wide numbers</span>
          </div>
          <div className={styles.yourStatsRow}>
            <div className={styles.yourStatChip}>
              <span className={styles.yourStatLabel}>Total actions</span>
              <span className={styles.yourStatValue}>{myStats.total}</span>
            </div>
            <div className={styles.yourStatChip}>
              <span className={styles.yourStatLabel}>Today</span>
              <span className={styles.yourStatValue}>{myStats.today}</span>
            </div>
            <div className={styles.yourStatChip}>
              <span className={styles.yourStatLabel}>This week</span>
              <span className={styles.yourStatValue}>{myStats.week}</span>
            </div>
          </div>
          <div className={styles.yourActivityList}>
            {myActivity.length === 0 ? (
              <div className={styles.yourActivityEmpty}>
                <Clock size={16} />
                <span>No actions yet</span>
              </div>
            ) : (
              myActivity.map((a, i) => (
                <div key={i} className={styles.yourActivityItem}>
                  <span className={styles.yourActivityAction}>{a.action}</span>
                  <span className={styles.yourActivityResource}>{a.resource_type}</span>
                  <span className={styles.yourActivityTime}>{timeAgo(a.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className={styles.statsGrid}>
        {visiblePrimary.map((stat) => (
          <button
            key={stat.label}
            className={`${styles.statCard} ${stat.urgent ? styles.statCardUrgent : ''}`}
            onClick={() => stat.path && navigate(stat.path)}
          >
            <div className={styles.statHeader}>
              <div className={`${styles.statIcon} ${styles[`statIcon${stat.color.charAt(0).toUpperCase() + stat.color.slice(1)}`]}`}>
                {stat.icon}
              </div>
              <ArrowRight size={16} className={styles.statArrow} />
            </div>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={styles.statValue}>{stat.value.toLocaleString()}</p>
            {stat.change > 0 && (
              <div className={styles.statChange}>
                <TrendingUp size={12} />
                <span>+{stat.change} {stat.changeLabel}</span>
              </div>
            )}
            {stat.urgent && (
              <div className={styles.statUrgentBadge}>
                <Shield size={12} />
                <span>Needs attention</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className={styles.secondaryGrid}>
        {visibleSecondary.map((stat) => (
          <button
            key={stat.label}
            className={styles.secondaryCard}
            onClick={() => stat.path && navigate(stat.path)}
            disabled={!stat.path}
          >
            <div className={styles.secondaryIcon}>{stat.icon}</div>
            <div className={styles.secondaryContent}>
              <p className={styles.secondaryLabel}>{stat.label}</p>
              <p className={styles.secondaryValue}>{stat.value.toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.activitySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <button className={styles.viewAllButton} onClick={() => navigate('/audit-log')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className={styles.activityList}>
          {activities.length === 0 ? (
            <div className={styles.emptyActivity}>
              <Activity size={32} />
              <p>No recent activity</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className={styles.activityItem}>
                <div className={`${styles.activityIcon} ${styles[`activityIcon${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}`]}`}>
                  {activity.type === 'user' && <Users size={14} />}
                  {activity.type === 'post' && <FileText size={14} />}
                  {activity.type === 'report' && <Flag size={14} />}
                  {activity.type === 'match' && <Heart size={14} />}
                </div>
                <div className={styles.activityContent}>
                  <span className={styles.activityTitle}>{activity.title}</span>
                  <span className={styles.activitySubtitle}>{activity.subtitle}</span>
                </div>
                <span className={styles.activityTime}>{timeAgo(activity.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
