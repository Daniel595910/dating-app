import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Send,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  BellRing,
  Megaphone,
  Trash2,
  CheckCircle,
  Clock,

  Plus,
  Sparkles,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  notificationService,
  Notification,
  NotificationType,
  BroadcastInput,
} from '@/services/notification.service';
import styles from './NotificationsPage.module.css';

const PAGE_SIZE = 30;

const TYPE_INFO: Record<string, { label: string; color: string }> = {
  system: { label: 'System', color: '#3b82f6' },
  match: { label: 'Match', color: '#ec4899' },
  message: { label: 'Message', color: '#10b981' },
  like: { label: 'Like', color: '#ef4444' },
  comment: { label: 'Comment', color: '#8b5cf6' },
  mention: { label: 'Mention', color: '#f59e0b' },
  verification: { label: 'Verification', color: '#10b981' },
  vip: { label: 'VIP', color: '#f59e0b' },
  report: { label: 'Report', color: '#ef4444' },
  community: { label: 'Community', color: '#8b5cf6' },
};

export const NotificationsPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0, unread: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');

  // Broadcast modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState<BroadcastInput>({
    title: '',
    body: '',
    type: 'system',
    targetAudience: 'all',
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Delete
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [result, statsData] = await Promise.all([
        notificationService.getNotifications({
          search: debouncedSearch,
          type: typeFilter,
          status: statusFilter,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
        notificationService.getStats(),
      ]);

      setNotifications(result.items);
      setTotal(result.total);
      setStats(statsData);
    } catch (err: any) {
      toast.error('Failed to load', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, typeFilter, statusFilter, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, typeFilter, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    toast.success('Refreshed');
  };

  const handleBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.body.trim()) {
      toast.warning('Title and message are required');
      return;
    }

    setSendingBroadcast(true);
    try {
      const result = await notificationService.sendBroadcast(broadcastForm);

      if (result.failed > 0) {
        toast.warning(
          `Sent to ${result.sent} users, ${result.failed} failed`
        );
      } else {
        toast.success(`Broadcast sent to ${result.sent} users`);
      }

      setShowBroadcastModal(false);
      setBroadcastForm({
        title: '',
        body: '',
        type: 'system',
        targetAudience: 'all',
      });
      loadData(false);
    } catch (err: any) {
      toast.error('Broadcast failed', err.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleDelete = async () => {
    if (!notificationToDelete) return;
    setDeleting(true);
    try {
      await notificationService.deleteNotification(notificationToDelete.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationToDelete.id));
      toast.success('Notification deleted');
      setNotificationToDelete(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            Send announcements and manage user notifications
          </p>
        </div>
        <div className={styles.headerActions}>
          {hasPermission('SETTINGS_EDIT') && (
            <Button
              icon={<Megaphone size={16} />}
              onClick={() => setShowBroadcastModal(true)}
            >
              Send Broadcast
            </Button>
          )}
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Bell size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Sent</p>
            <p className={styles.statValue}>{stats.total.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Clock size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Today</p>
            <p className={styles.statValue}>{stats.today.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <BellRing size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>This Week</p>
            <p className={styles.statValue}>{stats.week.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <BellRing size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Unread</p>
            <p className={styles.statValue}>{stats.unread.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.select}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>

        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <Loader fullScreen text="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<Bell size={32} />}
            title="No notifications"
            description="Notifications sent to users will appear here."
            action={
              hasPermission('SETTINGS_EDIT') ? (
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => setShowBroadcastModal(true)}
                >
                  Send First Broadcast
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.notificationsList}>
            {notifications.map((notification) => {
              const typeInfo = TYPE_INFO[notification.type] || { label: notification.type, color: '#6b7280' };
              return (
                <div key={notification.id} className={styles.notificationCard}>
                  <div
                    className={styles.typeIndicator}
                    style={{ background: typeInfo.color }}
                  />

                  <div className={styles.notificationContent}>
                    <div className={styles.notificationHeader}>
                      <div className={styles.typeBadge}>
                        <span
                          className={styles.typeDot}
                          style={{ background: typeInfo.color }}
                        />
                        <span className={styles.typeLabel}>{typeInfo.label}</span>
                      </div>
                      <Badge
                        variant={notification.status === 'unread' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {notification.status}
                      </Badge>
                      <span className={styles.notificationTime}>
                        <Clock size={11} /> {timeAgo(notification.created_at)}
                      </span>
                    </div>

                    <h3 className={styles.notificationTitle}>{notification.title}</h3>
                    <p className={styles.notificationBody}>{notification.body}</p>

                    {notification.user && (
                      <div className={styles.notificationUser}>
                        <Avatar
                          src={notification.user.avatar_url}
                          name={notification.user.display_name}
                          size="xs"
                        />
                        <span className={styles.userName}>
                          To: {notification.user.display_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {hasPermission('SETTINGS_EDIT') && (
                    <button
                      className={styles.deleteButton}
                      onClick={() => setNotificationToDelete(notification)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Broadcast Modal */}
      <Modal
        open={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        title="Send Broadcast"
        description="Send a notification to multiple users at once"
        size="md"
      >
        <div className={styles.broadcastForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Target Audience</label>
            <div className={styles.audienceOptions}>
              {[
                { id: 'all', label: 'All Users', icon: <Users size={14} /> },
                { id: 'verified', label: 'Verified Only', icon: <CheckCircle size={14} /> },
                { id: 'vip', label: 'VIP Only', icon: <Sparkles size={14} /> },
              ].map((option) => (
                <button
                  key={option.id}
                  className={`${styles.audienceOption} ${broadcastForm.targetAudience === option.id ? styles.audienceOptionActive : ''}`}
                  onClick={() =>
                    setBroadcastForm((prev) => ({ ...prev, targetAudience: option.id as any }))
                  }
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Type</label>
            <select
              className={styles.select}
              value={broadcastForm.type}
              onChange={(e) =>
                setBroadcastForm((prev) => ({ ...prev, type: e.target.value as NotificationType }))
              }
            >
              <option value="system">System Announcement</option>
              <option value="vip">VIP Update</option>
              <option value="verification">Verification</option>
              <option value="community">Community</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., New Feature Available!"
              value={broadcastForm.title}
              onChange={(e) =>
                setBroadcastForm((prev) => ({ ...prev, title: e.target.value }))
              }
              maxLength={100}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Message *</label>
            <textarea
              className={styles.textarea}
              placeholder="Write your announcement..."
              value={broadcastForm.body}
              onChange={(e) =>
                setBroadcastForm((prev) => ({ ...prev, body: e.target.value }))
              }
              rows={5}
              maxLength={500}
            />
            <span className={styles.charCount}>
              {broadcastForm.body.length} / 500
            </span>
          </div>
        </div>

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setShowBroadcastModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Send size={16} />}
            onClick={handleBroadcast}
            loading={sendingBroadcast}
            disabled={!broadcastForm.title.trim() || !broadcastForm.body.trim()}
          >
            Send Broadcast
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!notificationToDelete}
        onClose={() => setNotificationToDelete(null)}
        onConfirm={handleDelete}
        title="Delete notification?"
        description="This notification will be permanently deleted."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
