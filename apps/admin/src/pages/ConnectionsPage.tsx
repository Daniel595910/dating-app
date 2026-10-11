import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  X,
  Trash2,
  ExternalLink,
  MessageSquare,
  UserCheck,
  UserX,
  AlertCircle,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { connectionService, MatchRequest, RequestFilters } from '@/services/connection.service';
import styles from './ConnectionsPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'all' | 'pending' | 'accepted' | 'declined' | 'cancelled';

export const ConnectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    cancelled: 0,
    today: 0,
    week: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'cancel' | 'delete';
    request: MatchRequest;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);

        const [result, statsData] = await Promise.all([
          connectionService.getRequests({
            search: debouncedSearch,
            status: activeTab === 'all' ? 'all' : (activeTab as RequestFilters['status']),
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          }),
          connectionService.getStats(),
        ]);

        setRequests(result.items);
        setTotal(result.total);
        setStats(statsData);
      } catch (err: any) {
        toast.error('Failed to load', err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, debouncedSearch, page, toast]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, debouncedSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    toast.success('Refreshed');
  };

  const handleCancel = async (request: MatchRequest) => {
    setActionLoading(true);
    try {
      await connectionService.cancelRequest(request.id);
      toast.success('Request cancelled');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Cancel failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (request: MatchRequest) => {
    setActionLoading(true);
    try {
      await connectionService.deleteRequest(request.id);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      toast.success('Request deleted');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setActionLoading(false);
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

  const getStatusVariant = (
    status: string
  ): 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'success';
      case 'declined':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Connection Requests</h1>
          <p className={styles.subtitle}>
            {stats.pending > 0
              ? `${stats.pending} pending request${stats.pending > 1 ? 's' : ''}`
              : 'Monitor user connection activity'}
          </p>
        </div>
        <button
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <button
          className={`${styles.statCard} ${activeTab === 'all' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Heart size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Total</p>
            <p className={styles.statValue}>{stats.total.toLocaleString()}</p>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'pending' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Pending</p>
            <p className={styles.statValue}>{stats.pending.toLocaleString()}</p>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'accepted' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <UserCheck size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Accepted</p>
            <p className={styles.statValue}>{stats.accepted.toLocaleString()}</p>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'declined' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('declined')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <UserX size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Declined</p>
            <p className={styles.statValue}>{stats.declined.toLocaleString()}</p>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by user name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <Loader fullScreen text="Loading connection requests..." />
      ) : requests.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<Heart size={32} />}
            title={
              activeTab === 'pending'
                ? 'No pending requests'
                : debouncedSearch
                ? 'No matching requests'
                : 'No connection requests'
            }
            description={
              activeTab === 'pending'
                ? 'All connection requests have been resolved.'
                : debouncedSearch
                ? `No requests match "${debouncedSearch}"`
                : 'User connection requests will appear here.'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.requestsList}>
            {requests.map((request) => (
              <div key={request.id} className={styles.requestCard}>
                <div className={styles.requestUsers}>
                  <div className={styles.requestUser}>
                    <Avatar
                      src={request.requester?.avatar_url}
                      name={request.requester?.display_name || 'User'}
                      size="md"
                    />
                    <div className={styles.userInfo}>
                      <div className={styles.nameRow}>
                        <span className={styles.userName}>
                          {request.requester?.display_name || 'Unknown'}
                        </span>
                        {request.requester?.is_verified && (
                          <span className={styles.verified}>✓</span>
                        )}
                      </div>
                      <span className={styles.userLabel}>Requester</span>
                    </div>
                  </div>

                  <div className={styles.arrowConnector}>
                    <Heart size={16} className={styles.heartIcon} />
                  </div>

                  <div className={`${styles.requestUser} ${styles.requestUserRight}`}>
                    <div className={styles.userInfo}>
                      <div className={styles.nameRow}>
                        <span className={styles.userName}>
                          {request.target?.display_name || 'Unknown'}
                        </span>
                        {request.target?.is_verified && (
                          <span className={styles.verified}>✓</span>
                        )}
                      </div>
                      <span className={styles.userLabel}>Target</span>
                    </div>
                    <Avatar
                      src={request.target?.avatar_url}
                      name={request.target?.display_name || 'User'}
                      size="md"
                    />
                  </div>
                </div>

                {request.message && (
                  <div className={styles.messageBox}>
                    <MessageSquare size={12} />
                    <p className={styles.messageText}>{request.message}</p>
                  </div>
                )}

                <div className={styles.requestFooter}>
                  <div className={styles.footerLeft}>
                    <Badge variant={getStatusVariant(request.status)} size="sm">
                      {request.status}
                    </Badge>
                    <span className={styles.timeAgo}>
                      <Clock size={11} /> {timeAgo(request.created_at)}
                    </span>
                  </div>

                  <div className={styles.footerActions}>
                    {hasPermission('USER_VIEW') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ExternalLink size={14} />}
                        onClick={() => navigate(`/users/${request.requester_id}`)}
                      >
                        View Requester
                      </Button>
                    )}
                    {hasPermission('USER_VIEW') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ExternalLink size={14} />}
                        onClick={() => navigate(`/users/${request.target_id}`)}
                      >
                        View Target
                      </Button>
                    )}
                    {request.status === 'pending' && hasPermission('USER_EDIT') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<X size={14} />}
                        onClick={() => setConfirmAction({ type: 'cancel', request })}
                      >
                        Cancel
                      </Button>
                    )}
                    {hasPermission('USER_DELETE') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 size={14} />}
                        onClick={() => setConfirmAction({ type: 'delete', request })}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
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

      {/* Cancel confirm */}
      <ConfirmDialog
        open={confirmAction?.type === 'cancel'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleCancel(confirmAction.request)}
        title="Cancel this connection request?"
        description="The request will be marked as cancelled. The user can send a new request later."
        confirmText="Cancel Request"
        variant="warning"
        loading={actionLoading}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleDelete(confirmAction.request)}
        title="Delete this connection request?"
        description="This action cannot be undone. The request will be permanently removed."
        confirmText="Delete"
        variant="danger"
        requireTyping="DELETE"
        loading={actionLoading}
      />
    </div>
  );
};
