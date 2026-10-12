import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
  Trash2,
  ExternalLink,
  Clock,
  Heart,
  Play,
  AlertTriangle,
  Lock,
  Square,
  CheckSquare,
  Flag,

} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { videoService, DiscoverVideo, VideoFilters } from '@/services/video.service';
import styles from './DiscoverVideosPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'all' | 'pending' | 'approved' | 'rejected' | 'removed' | 'reported';

export const DiscoverVideosPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [videos, setVideos] = useState<DiscoverVideo[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    removed: 0,
    today: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<DiscoverVideo | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'remove' | 'delete' | 'bulk-approve' | 'bulk-reject' | 'bulk-remove' | 'bulk-delete';
    video: DiscoverVideo | null;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);

        const [result, statsData] = await Promise.all([
          activeTab === 'reported'
            ? videoService.getReportedVideos()
            : videoService.getVideos({
                search: debouncedSearch,
                status: activeTab === 'all' ? 'all' : (activeTab as VideoFilters['status']),
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
              }),
          videoService.getStats(),
        ]);

        setVideos(result.items);
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
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [activeTab, debouncedSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    toast.success('Refreshed');
  };

  const handleApprove = async (video: DiscoverVideo) => {
    setActionLoading(true);
    try {
      await videoService.approveVideo(video.id);
      toast.success('Video approved');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Approve failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (video: DiscoverVideo) => {
    if (!rejectReason.trim()) {
      toast.warning('Please provide a reason');
      return;
    }

    setActionLoading(true);
    try {
      await videoService.rejectVideo(video.id, rejectReason);
      toast.success('Video rejected');
      setConfirmAction(null);
      setRejectReason('');
      loadData(false);
    } catch (err: any) {
      toast.error('Reject failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (video: DiscoverVideo) => {
    setActionLoading(true);
    try {
      await videoService.removeVideo(video.id);
      toast.success('Video removed');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Remove failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (video: DiscoverVideo) => {
    setActionLoading(true);
    try {
      await videoService.deleteVideo(video.id);
      toast.success('Video deleted');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelection = (videoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map((v) => v.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'remove' | 'delete') => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    const ids = Array.from(selectedIds);
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        if (action === 'approve') {
          await videoService.approveVideo(id);
        } else if (action === 'reject') {
          await videoService.rejectVideo(id, rejectReason || 'Bulk rejected by admin');
        } else if (action === 'remove') {
          await videoService.removeVideo(id);
        } else if (action === 'delete') {
          await videoService.deleteVideo(id);
        }
        success++;
      } catch (err) {
        failed++;
      }
    }

    setBulkActionLoading(false);
    setConfirmAction(null);
    setRejectReason('');
    clearSelection();

    if (failed > 0) {
      toast.warning(`Processed ${success} videos, ${failed} failed`);
    } else {
      toast.success(`Successfully processed ${success} video${success > 1 ? 's' : ''}`);
    }

    loadData(false);
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
      case 'approved':
      case 'published':
        return 'success';
      case 'rejected':
        return 'error';
      case 'removed':
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
          <h1 className={styles.title}>Discover Videos</h1>
          <p className={styles.subtitle}>
            {stats.pending > 0
              ? `${stats.pending} video${stats.pending > 1 ? 's' : ''} pending review`
              : 'Review user-submitted videos'}
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

      {/* Info banner for Approved tab */}
      {activeTab === 'approved' && stats.approved > 0 && (
        <div className={styles.infoBanner}>
          <Eye size={16} />
          <div>
            <strong>Live videos:</strong> These videos are visible to all users in the discover feed.
            Remove any video that violates our community guidelines.
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <button
          className={`${styles.statCard} ${activeTab === 'all' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Video size={18} />
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
          className={`${styles.statCard} ${activeTab === 'approved' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Check size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Approved</p>
            <p className={styles.statValue}>{stats.approved.toLocaleString()}</p>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'rejected' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <X size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Rejected</p>
            <p className={styles.statValue}>{stats.rejected.toLocaleString()}</p>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'removed' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('removed')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }}>
            <Eye size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Removed</p>
            <p className={styles.statValue}>{stats.removed.toLocaleString()}</p>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'reported' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('reported')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Flag size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Reported</p>
            <p className={styles.statValue}>—</p>
          </div>
        </button>
      </div>

      {/* Search + Selection toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by caption or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!selectionMode && videos.length > 0 && (
          <button
            className={styles.selectModeButton}
            onClick={() => setSelectionMode(true)}
          >
            <CheckSquare size={14} />
            Select
          </button>
        )}

        {selectionMode && (
          <div className={styles.selectionBar}>
            <button
              className={styles.selectAllButton}
              onClick={toggleSelectAll}
            >
              {selectedIds.size === videos.length && videos.length > 0 ? (
                <CheckSquare size={14} />
              ) : (
                <Square size={14} />
              )}
              {selectedIds.size === videos.length && videos.length > 0
                ? 'Deselect all'
                : 'Select all'}
            </button>

            <span className={styles.selectionCount}>
              {selectedIds.size} selected
            </span>

            <button
              className={styles.cancelSelectionButton}
              onClick={clearSelection}
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <span className={styles.bulkActionsLabel}>
            Bulk actions for {selectedIds.size} video{selectedIds.size > 1 ? 's' : ''}:
          </span>

          <div className={styles.bulkActionsButtons}>
            {activeTab === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Check size={14} />}
                  onClick={() => setConfirmAction({ type: 'bulk-approve', video: null })}
                >
                  Approve All
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<X size={14} />}
                  onClick={() => setConfirmAction({ type: 'bulk-reject', video: null })}
                >
                  Reject All
                </Button>
              </>
            )}

            {activeTab === 'approved' && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Eye size={14} />}
                onClick={() => setConfirmAction({ type: 'bulk-remove', video: null })}
              >
                Remove from Feed
              </Button>
            )}

            {hasPermission('CONTENT_DELETE') && (
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={14} />}
                onClick={() => setConfirmAction({ type: 'bulk-delete', video: null })}
              >
                Delete All
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <Loader fullScreen text="Loading videos..." />
      ) : videos.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<Video size={32} />}
            title={
              activeTab === 'pending'
                ? 'No videos pending review'
                : activeTab === 'approved'
                ? 'No approved videos'
                : activeTab === 'removed'
                ? 'No removed videos'
                : activeTab === 'reported'
                ? 'No reported videos'
                : debouncedSearch
                ? 'No matching videos'
                : 'No videos'
            }
            description={
              activeTab === 'pending'
                ? 'All submissions have been reviewed.'
                : activeTab === 'approved'
                ? 'Approved videos will appear here.'
                : activeTab === 'removed'
                ? 'Videos removed after approval will appear here.'
                : activeTab === 'reported'
                ? 'Videos reported by users will appear here for review.'
                : debouncedSearch
                ? `No videos match "${debouncedSearch}"`
                : 'User-submitted videos will appear here.'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.videosGrid}>
            {videos.map((video) => (
              <div key={video.id} className={styles.videoCard}>
                {/* Thumbnail */}
                <div
                  className={`${styles.videoThumbnail} ${selectedIds.has(video.id) ? styles.videoThumbnailSelected : ''}`}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelection(video.id);
                    } else {
                      setSelectedVideo(video);
                    }
                  }}
                >
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.caption || 'Video'} loading="lazy" />
                  ) : (
                    <div className={styles.thumbnailPlaceholder}>
                      <Video size={32} />
                    </div>
                  )}

                  {!selectionMode && (
                    <div className={styles.playOverlay}>
                      <div className={styles.playButton}>
                        <Play size={20} fill="#fff" />
                      </div>
                    </div>
                  )}

                  <div className={styles.thumbnailBadges}>
                    <Badge variant={getStatusVariant(video.status)} size="sm">
                      {video.status}
                    </Badge>
                    {video.privacy === 'private' && (
                      <Badge variant="default" size="sm">
                        <Lock size={10} /> Private
                      </Badge>
                    )}
                  </div>

                  {selectionMode && (
                    <div className={styles.selectionOverlay}>
                      <div className={`${styles.selectionCheckbox} ${selectedIds.has(video.id) ? styles.selectionCheckboxChecked : ''}`}>
                        {selectedIds.has(video.id) && <Check size={16} />}
                      </div>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className={styles.videoBody}>
                  <div className={styles.videoAuthor}>
                    <Avatar
                      src={video.user?.avatar_url}
                      name={video.user?.display_name || 'User'}
                      size="xs"
                    />
                    <div className={styles.authorInfo}>
                      <span className={styles.authorName}>
                        {video.user?.display_name || 'Unknown'}
                      </span>
                      {video.user?.is_verified && <span className={styles.verified}>✓</span>}
                    </div>
                    <span className={styles.videoTime}>{timeAgo(video.created_at)}</span>
                  </div>

                  {video.caption && (
                    <p className={styles.videoCaption}>
                      {video.caption.substring(0, 100)}
                      {video.caption.length > 100 ? '...' : ''}
                    </p>
                  )}

                  <div className={styles.videoStats}>
                    <span>
                      <Eye size={11} /> {video.view_count?.toLocaleString() || 0}
                    </span>
                    <span>
                      <Heart size={11} /> {video.like_count?.toLocaleString() || 0}
                    </span>
                  </div>

                  {video.rejection_reason && (
                    <div className={styles.rejectionBox}>
                      <AlertTriangle size={12} />
                      <span>{video.rejection_reason}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className={styles.videoActions}>
                  {video.status === 'pending' && hasPermission('CONTENT_MODERATE') && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Check size={14} />}
                        onClick={() => setConfirmAction({ type: 'approve', video })}
                        fullWidth
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<X size={14} />}
                        onClick={() => setConfirmAction({ type: 'reject', video })}
                        fullWidth
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {(video.status === 'approved' || video.status === 'published') &&
                    hasPermission('CONTENT_MODERATE') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Eye size={14} />}
                        onClick={() => setConfirmAction({ type: 'remove', video })}
                        fullWidth
                      >
                        Remove from Feed
                      </Button>
                    )}

                  {video.status === 'removed' && hasPermission('CONTENT_MODERATE') && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Check size={14} />}
                      onClick={() => setConfirmAction({ type: 'approve', video })}
                      fullWidth
                    >
                      Restore to Feed
                    </Button>
                  )}

                  {hasPermission('CONTENT_DELETE') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => setConfirmAction({ type: 'delete', video })}
                      fullWidth
                    >
                      Delete
                    </Button>
                  )}
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

      {/* Video preview modal */}
      <Modal
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        title="Video Preview"
        size="lg"
      >
        {selectedVideo && (
          <div className={styles.previewModal}>
            <div className={styles.previewVideo}>
              <video
                src={selectedVideo.video_url}
                controls
                autoPlay
                playsInline
                className={styles.previewPlayer}
              />
            </div>

            <div className={styles.previewInfo}>
              <div className={styles.previewAuthor}>
                <Avatar
                  src={selectedVideo.user?.avatar_url}
                  name={selectedVideo.user?.display_name || 'User'}
                  size="md"
                />
                <div>
                  <span className={styles.previewAuthorName}>
                    {selectedVideo.user?.display_name || 'Unknown'}
                  </span>
                  <span className={styles.previewAuthorMeta}>
                    {timeAgo(selectedVideo.created_at)}
                  </span>
                </div>
              </div>

              {selectedVideo.caption && (
                <p className={styles.previewCaption}>{selectedVideo.caption}</p>
              )}

              <div className={styles.previewStats}>
                <span>
                  <Eye size={14} /> {selectedVideo.view_count} views
                </span>
                <span>
                  <Heart size={14} /> {selectedVideo.like_count} likes
                </span>
              </div>

              {selectedVideo.rejection_reason && (
                <div className={styles.rejectionBox}>
                  <AlertTriangle size={14} />
                  <span>
                    <strong>Rejection reason:</strong> {selectedVideo.rejection_reason}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.previewActions}>
              {hasPermission('USER_VIEW') && (
                <Button
                  variant="ghost"
                  icon={<ExternalLink size={14} />}
                  onClick={() => {
                    navigate(`/users/${selectedVideo.user_id}`);
                    setSelectedVideo(null);
                  }}
                >
                  View Author
                </Button>
              )}

              {selectedVideo.status === 'pending' && hasPermission('CONTENT_MODERATE') && (
                <>
                  <Button
                    variant="secondary"
                    icon={<X size={14} />}
                    onClick={() => {
                      setConfirmAction({ type: 'reject', video: selectedVideo });
                      setSelectedVideo(null);
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    icon={<Check size={14} />}
                    onClick={() => {
                      setConfirmAction({ type: 'approve', video: selectedVideo });
                      setSelectedVideo(null);
                    }}
                  >
                    Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve / Restore confirmation */}
      <ConfirmDialog
        open={confirmAction?.type === 'approve'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.video) void handleApprove(confirmAction.video); }}
        title={confirmAction?.video?.status === 'removed' ? 'Restore this video?' : 'Approve this video?'}
        description={
          confirmAction?.video?.status === 'removed'
            ? 'The video will be restored to the discover feed and visible to all users again.'
            : 'The video will be published to the discover feed and visible to all users.'
        }
        confirmText={confirmAction?.video?.status === 'removed' ? 'Restore' : 'Approve'}
        variant="info"
        loading={actionLoading}
      />

      {/* Reject confirmation */}
      <ConfirmDialog
        open={confirmAction?.type === 'reject'}
        onClose={() => {
          setConfirmAction(null);
          setRejectReason('');
        }}
        onConfirm={() => { if (confirmAction?.video) void handleReject(confirmAction.video); }}
        title="Reject this video?"
        description="Provide a reason for rejection. The user will see this reason."
        confirmText="Reject"
        variant="warning"
        loading={actionLoading}
      >
        <div style={{ marginTop: 16 }}>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason (required)..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--color-text)',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      </ConfirmDialog>

      {/* Remove confirmation */}
      <ConfirmDialog
        open={confirmAction?.type === 'remove'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.video) void handleRemove(confirmAction.video); }}
        title="Remove this video?"
        description="The video will be hidden from the discover feed but not deleted."
        confirmText="Remove"
        variant="warning"
        loading={actionLoading}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.video) void handleDelete(confirmAction.video); }}
        title="Delete this video?"
        description="This action cannot be undone. The video will be permanently deleted."
        confirmText="Delete"
        variant="danger"
        requireTyping="DELETE"
        loading={actionLoading}
      />

      {/* Bulk approve */}
      <ConfirmDialog
        open={confirmAction?.type === 'bulk-approve'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleBulkAction('approve')}
        title={`Approve ${selectedIds.size} videos?`}
        description="All selected videos will be published to the discover feed and visible to all users."
        confirmText={`Approve ${selectedIds.size}`}
        variant="info"
        loading={bulkActionLoading}
      />

      {/* Bulk reject */}
      <ConfirmDialog
        open={confirmAction?.type === 'bulk-reject'}
        onClose={() => {
          setConfirmAction(null);
          setRejectReason('');
        }}
        onConfirm={() => handleBulkAction('reject')}
        title={`Reject ${selectedIds.size} videos?`}
        description="All selected videos will be rejected. The same reason will be applied to all."
        confirmText={`Reject ${selectedIds.size}`}
        variant="warning"
        loading={bulkActionLoading}
      >
        <div style={{ marginTop: 16 }}>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason (required)..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--color-text)',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      </ConfirmDialog>

      {/* Bulk remove */}
      <ConfirmDialog
        open={confirmAction?.type === 'bulk-remove'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleBulkAction('remove')}
        title={`Remove ${selectedIds.size} videos from feed?`}
        description="All selected videos will be hidden from the discover feed but not deleted."
        confirmText={`Remove ${selectedIds.size}`}
        variant="warning"
        loading={bulkActionLoading}
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={confirmAction?.type === 'bulk-delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleBulkAction('delete')}
        title={`Delete ${selectedIds.size} videos?`}
        description="This action cannot be undone. All selected videos will be permanently deleted."
        confirmText={`Delete ${selectedIds.size}`}
        variant="danger"
        requireTyping="DELETE"
        loading={bulkActionLoading}
      />
    </div>
  );
};









