import React, { useState, useEffect, useCallback } from 'react';
import {
  UsersRound,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,

  Check,
  X,
  Star,
  Eye,
  EyeOff,
  Trash2,
  MoreVertical,
  Globe,
  MapPin,
  Users,
  Lock,
  Clock,

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
  communityService,
  Community,
  CommunityRequest,
  CommunityFilters,
} from '@/services/community.service';
import styles from './CommunitiesPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'active' | 'requests' | 'all' | 'featured' | 'private' | 'inactive';

export const CommunitiesPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, private: 0, pending: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Actions
  const [, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CommunityRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'reject' | 'approve';
    id: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      if (activeTab === 'requests') {
        const result = await communityService.getPendingRequests(PAGE_SIZE, page * PAGE_SIZE);
        setRequests(result.items);
        setTotal(result.total);
      } else {
        const filters: CommunityFilters = {
          search: debouncedSearch,
          status: activeTab === 'all' ? 'all' : activeTab,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        };
        const result = await communityService.getCommunities(filters);
        setCommunities(result.items);
        setTotal(result.total);
      }
    } catch (err: any) {
      toast.error('Failed to load', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debouncedSearch, page, toast]);

  const loadStats = async () => {
    try {
      const s = await communityService.getStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadStats();
  }, [loadData]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, debouncedSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(false), loadStats()]);
    toast.success('Refreshed');
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      await communityService.approveRequest(requestId);
      toast.success('Community approved and created');
      setSelectedRequest(null);
      setConfirmAction(null);
      loadData(false);
      loadStats();
    } catch (err: any) {
      toast.error('Approval failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectReason.trim()) {
      toast.warning('Rejection reason required');
      return;
    }
    setActionLoading(true);
    try {
      await communityService.rejectRequest(requestId, rejectReason);
      toast.success('Request rejected');
      setSelectedRequest(null);
      setRejectReason('');
      setConfirmAction(null);
      loadData(false);
      loadStats();
    } catch (err: any) {
      toast.error('Rejection failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (community: Community) => {
    try {
      await communityService.toggleActive(community.id, !community.is_active);
      setCommunities((prev) =>
        prev.map((c) => (c.id === community.id ? { ...c, is_active: !c.is_active } : c))
      );
      toast.success(community.is_active ? 'Community deactivated' : 'Community activated');
    } catch (err: any) {
      toast.error('Action failed', err.message);
    }
    setOpenMenuId(null);
  };

  const handleToggleFeatured = async (community: Community) => {
    try {
      await communityService.toggleFeatured(community.id, !community.is_featured);
      setCommunities((prev) =>
        prev.map((c) => (c.id === community.id ? { ...c, is_featured: !c.is_featured } : c))
      );
      toast.success(community.is_featured ? 'Removed from featured' : 'Added to featured');
    } catch (err: any) {
      toast.error('Action failed', err.message);
    }
    setOpenMenuId(null);
  };

  const handleDelete = async (communityId: string) => {
    setActionLoading(true);
    try {
      await communityService.deleteCommunity(communityId);
      setCommunities((prev) => prev.filter((c) => c.id !== communityId));
      toast.success('Community deleted');
      setConfirmAction(null);
      loadStats();
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Communities</h1>
          <p className={styles.subtitle}>Manage communities and approve new requests</p>
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
          className={`${styles.statCard} ${activeTab === 'active' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <UsersRound size={18} />
          </div>
          <div>
            <span className={styles.statLabel}>Active</span>
            <span className={styles.statValue}>{stats.active}</span>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'requests' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <div className={styles.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={18} />
          </div>
          <div>
            <span className={styles.statLabel}>Pending</span>
            <span className={styles.statValue}>{stats.pending}</span>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'private' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('private')}
        >
          <div className={styles.statIconWrapper} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Lock size={18} />
          </div>
          <div>
            <span className={styles.statLabel}>Private</span>
            <span className={styles.statValue}>{stats.private}</span>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'featured' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('featured')}
        >
          <div className={styles.statIconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Star size={18} />
          </div>
          <div>
            <span className={styles.statLabel}>Featured</span>
            <span className={styles.statValue}>—</span>
          </div>
        </button>
      </div>

      {/* Filters */}
      {activeTab !== 'requests' && (
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search communities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.filterTabs}>
            {(['all', 'active', 'inactive', 'featured', 'private'] as Tab[]).map((tab) => (
              <button
                key={tab}
                className={`${styles.filterTab} ${activeTab === tab ? styles.filterTabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Loader fullScreen text="Loading communities..." />
      ) : activeTab === 'requests' ? (
        // Requests view
        requests.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={<Check size={32} />}
              title="No pending requests"
              description="All community requests have been reviewed."
            />
          </div>
        ) : (
          <div className={styles.requestsList}>
            {requests.map((request) => (
              <div key={request.id} className={styles.requestCard}>
                <div className={styles.requestHeader}>
                  <div className={styles.requestTitle}>
                    <div className={styles.requestIcon}>
                      <UsersRound size={18} />
                    </div>
                    <div>
                      <h3 className={styles.requestName}>{request.name}</h3>
                      <p className={styles.requestMeta}>
                        <MapPin size={11} />
                        {request.city && `${request.city}, `}
                        {request.state && `${request.state}, `}
                        {request.country}
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning" size="sm">
                    Pending
                  </Badge>
                </div>

                <p className={styles.requestDescription}>{request.description}</p>

                <div className={styles.requestTags}>
                  <span className={styles.tag}>
                    <Globe size={11} /> {request.region_type || 'city'}
                  </span>
                  {request.is_private && (
                    <span className={styles.tag}>
                      <Lock size={11} /> Private
                    </span>
                  )}
                </div>

                <div className={styles.requestFooter}>
                  <div className={styles.requesterInfo}>
                    <Avatar
                      src={request.requester?.avatar_url}
                      name={request.requester?.display_name || 'User'}
                      size="xs"
                    />
                    <div>
                      <span className={styles.requesterLabel}>Requested by</span>
                      <span className={styles.requesterName}>
                        {request.requester?.display_name || 'Unknown'}
                      </span>
                    </div>
                    <span className={styles.requestTime}>
                      {timeAgo(request.created_at)}
                    </span>
                  </div>

                  <div className={styles.requestActions}>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<X size={14} />}
                      onClick={() => {
                        setSelectedRequest(request);
                        setConfirmAction({ type: 'reject', id: request.id });
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Check size={14} />}
                      onClick={() => {
                        setSelectedRequest(request);
                        setConfirmAction({ type: 'approve', id: request.id });
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Communities view
        communities.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={<UsersRound size={32} />}
              title={debouncedSearch ? 'No matching communities' : 'No communities'}
              description={
                debouncedSearch
                  ? `No communities match "${debouncedSearch}"`
                  : 'Communities will appear here once approved.'
              }
            />
          </div>
        ) : (
          <>
            <div className={styles.communitiesGrid}>
              {communities.map((community) => (
                <div key={community.id} className={styles.communityCard}>
                  <div className={styles.communityCover}>
                    {community.cover_url ? (
                      <img src={community.cover_url} alt={community.name} />
                    ) : (
                      <div className={styles.coverPlaceholder}>
                        <UsersRound size={28} />
                      </div>
                    )}
                    {community.is_featured && (
                      <div className={styles.featuredBadge}>
                        <Star size={11} fill="#fff" /> Featured
                      </div>
                    )}
                  </div>

                  <div className={styles.communityBody}>
                    <div className={styles.communityHeader}>
                      <div className={styles.communityIcon}>
                        {community.avatar_url ? (
                          <img src={community.avatar_url} alt="" />
                        ) : (
                          community.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles.communityInfo}>
                        <h3 className={styles.communityName}>{community.name}</h3>
                        {community.city && community.country && (
                          <p className={styles.communityLocation}>
                            <MapPin size={10} />
                            {community.city}, {community.country}
                          </p>
                        )}
                      </div>

                      <div className={styles.menuWrapper}>
                        <button
                          className={styles.menuButton}
                          onClick={() => setOpenMenuId(openMenuId === community.id ? null : community.id)}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === community.id && (
                          <>
                            <div className={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />
                            <div className={styles.menu}>
                              <button
                                className={styles.menuItem}
                                onClick={() => handleToggleFeatured(community)}
                              >
                                <Star size={14} />
                                {community.is_featured ? 'Unfeature' : 'Feature'}
                              </button>
                              <button
                                className={styles.menuItem}
                                onClick={() => handleToggleActive(community)}
                              >
                                {community.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                                {community.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              {hasPermission('COMMUNITY_DELETE') && (
                                <button
                                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                  onClick={() => {
                                    setConfirmAction({ type: 'delete', id: community.id });
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {community.description && (
                      <p className={styles.communityDescription}>
                        {community.description.substring(0, 100)}
                        {community.description.length > 100 ? '...' : ''}
                      </p>
                    )}

                    <div className={styles.communityTypeRow}>
                      <span className={styles.tag}>
                        <Globe size={11} /> {community.type || 'community'}
                      </span>
                    </div>

                    <div className={styles.communityStats}>
                      <span className={styles.communityStat}>
                        <Users size={12} />
                        {(community.member_count || 0).toLocaleString()} members
                      </span>
                      {community.is_private && (
                        <span className={styles.communityStat}>
                          <Lock size={12} /> Private
                        </span>
                      )}
                      {!community.is_active && (
                        <Badge variant="default" size="sm">Inactive</Badge>
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
        )
      )}

      {/* Reject/Approve Modal */}
      <Modal
        open={!!confirmAction && (confirmAction.type === 'reject' || confirmAction.type === 'approve')}
        onClose={() => {
          setConfirmAction(null);
          setSelectedRequest(null);
          setRejectReason('');
        }}
        title={confirmAction?.type === 'approve' ? 'Approve community request?' : 'Reject community request?'}
        description={
          confirmAction?.type === 'approve'
            ? `"${selectedRequest?.name}" will be created as a new community.`
            : `Provide a reason for rejecting "${selectedRequest?.name}".`
        }
        size="md"
      >
        {confirmAction?.type === 'reject' && (
          <div className={styles.rejectForm}>
            <textarea
              className={styles.rejectInput}
              placeholder="Rejection reason (required)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
        )}

        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmAction(null);
              setSelectedRequest(null);
              setRejectReason('');
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant={confirmAction?.type === 'approve' ? 'primary' : 'danger'}
            onClick={() => {
              if (confirmAction?.type === 'approve') {
                handleApprove(confirmAction.id);
              } else if (confirmAction?.type === 'reject') {
                handleReject(confirmAction.id);
              }
            }}
            loading={actionLoading}
            disabled={confirmAction?.type === 'reject' && !rejectReason.trim()}
          >
            {confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) void handleDelete(confirmAction.id); }}
        title="Delete this community?"
        description="This action cannot be undone. All posts and memberships will be affected."
        confirmText="Delete Community"
        variant="danger"
        requireTyping="DELETE"
        loading={actionLoading}
      />
    </div>
  );
};

