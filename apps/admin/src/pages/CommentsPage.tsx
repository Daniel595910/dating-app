import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Flag,
  Ban,
  MoreVertical,
  ExternalLink,
  Clock,
  Heart,
  AlertTriangle,
  Image as ImageIcon,
  Gift,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { commentService, Comment, CommentFilters } from '@/services/comment.service';
import styles from './CommentsPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'all' | 'published' | 'reported' | 'hidden' | 'deleted';

export const CommentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    hidden: 0,
    deleted: 0,
    reported: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete' | 'flag' | 'ban';
    comment: Comment;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [result, statsData] = await Promise.all([
        commentService.getComments({
          search: debouncedSearch,
          status: activeTab === 'all' ? 'all' : (activeTab as CommentFilters['status']),
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
        commentService.getStats(),
      ]);

      setComments(result.items);
      setTotal(result.total);
      setStats(statsData);
    } catch (err: any) {
      toast.error('Failed to load', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debouncedSearch, page, toast]);

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

  const handleHide = async (comment: Comment) => {
    setActionLoading(true);
    try {
      await commentService.hideComment(comment.id, !comment.is_hidden);
      toast.success(comment.is_hidden ? 'Comment unhidden' : 'Comment hidden');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (comment: Comment) => {
    setActionLoading(true);
    try {
      await commentService.deleteComment(comment.id);
      toast.success('Comment deleted');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlag = async (comment: Comment) => {
    setActionLoading(true);
    try {
      await commentService.flagComment(comment.id, 'Flagged by admin');
      toast.success('Comment flagged for review');
      setConfirmAction(null);
    } catch (err: any) {
      toast.error('Flag failed', err.message);
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

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'gif':
        return <ImageIcon size={12} />;
      case 'sticker':
        return <ImageIcon size={12} />;
      case 'gift':
        return <Gift size={12} />;
      case 'emoji':
        return <span style={{ fontSize: 12 }}>😊</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (comment: Comment) => {
    if (comment.is_deleted) return <Badge variant="default" size="sm">Deleted</Badge>;
    if (comment.is_hidden) return <Badge variant="warning" size="sm">Hidden</Badge>;
    if (comment.status === 'flagged') return <Badge variant="error" size="sm">Flagged</Badge>;
    if ((comment.report_count || 0) > 0) {
      return (
        <Badge variant="error" size="sm">
          <Flag size={10} /> {comment.report_count}
        </Badge>
      );
    }
    return null;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Comments</h1>
          <p className={styles.subtitle}>
            {total > 0 ? `${total.toLocaleString()} comments` : 'Moderate user comments'}
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
            <MessageSquare size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Total</p>
            <p className={styles.statValue}>{stats.total.toLocaleString()}</p>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'published' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('published')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Clock size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Today</p>
            <p className={styles.statValue}>{stats.today.toLocaleString()}</p>
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
            <p className={styles.statValue}>{stats.reported.toLocaleString()}</p>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'hidden' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('hidden')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <EyeOff size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Hidden</p>
            <p className={styles.statValue}>{stats.hidden.toLocaleString()}</p>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search comment content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <Loader fullScreen text="Loading comments..." />
      ) : comments.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<MessageSquare size={32} />}
            title={debouncedSearch ? 'No matching comments' : 'No comments'}
            description={
              debouncedSearch
                ? `No comments match "${debouncedSearch}"`
                : 'Comments will appear here as users post them.'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.commentsList}>
            {comments.map((comment) => {
              const isHidden = comment.is_hidden === true;
              const isDeleted = comment.is_deleted === true;
              const hasReports = (comment.report_count || 0) > 0;
              const contentTypeIcon = getContentTypeIcon(comment.content_type);

              return (
                <div
                  key={comment.id}
                  className={`${styles.commentCard} ${isHidden ? styles.commentCardHidden : ''} ${isDeleted ? styles.commentCardDeleted : ''}`}
                >
                  {/* Header */}
                  <div className={styles.commentHeader}>
                    <div className={styles.commentAuthor}>
                      <Avatar
                        src={comment.author?.avatar_url}
                        name={comment.author?.display_name || 'User'}
                        size="sm"
                      />
                      <div className={styles.authorInfo}>
                        <div className={styles.authorNameRow}>
                          <span className={styles.authorName}>
                            {comment.author?.display_name || 'Unknown User'}
                          </span>
                          {comment.author?.is_verified && (
                            <span className={styles.verified}>✓</span>
                          )}
                        </div>
                        <span className={styles.commentTime}>
                          {timeAgo(comment.created_at)}
                          {comment.is_edited && ' · edited'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.commentBadges}>
                      {getStatusBadge(comment)}
                      {(comment.like_count || 0) > 0 && (
                        <span className={styles.likeCount}>
                          <Heart size={10} /> {comment.like_count}
                        </span>
                      )}
                    </div>

                    <div className={styles.menuWrapper}>
                      <button
                        className={styles.menuButton}
                        onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === comment.id && (
                        <>
                          <div
                            className={styles.menuOverlay}
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className={styles.menu}>
                            <button
                              className={styles.menuItem}
                              onClick={() => {
                                navigate(`/users/${comment.author_id}`);
                                setOpenMenuId(null);
                              }}
                            >
                              <ExternalLink size={14} /> View author
                            </button>

                            {hasPermission('CONTENT_MODERATE') && !isDeleted && (
                              <button
                                className={styles.menuItem}
                                onClick={() => {
                                  setConfirmAction({
                                    type: isHidden ? 'unhide' : 'hide',
                                    comment,
                                  });
                                  setOpenMenuId(null);
                                }}
                              >
                                {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                {isHidden ? 'Unhide' : 'Hide'}
                              </button>
                            )}

                            {hasPermission('CONTENT_MODERATE') && (
                              <button
                                className={`${styles.menuItem} ${styles.menuItemWarning}`}
                                onClick={() => {
                                  setConfirmAction({ type: 'flag', comment });
                                  setOpenMenuId(null);
                                }}
                              >
                                <Flag size={14} /> Flag for review
                              </button>
                            )}

                            {hasPermission('CONTENT_DELETE') && !isDeleted && (
                              <button
                                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                onClick={() => {
                                  setConfirmAction({ type: 'delete', comment });
                                  setOpenMenuId(null);
                                }}
                              >
                                <Trash2 size={14} /> Delete comment
                              </button>
                            )}

                            {hasPermission('USER_BAN') && (
                              <button
                                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                onClick={() => {
                                  setConfirmAction({ type: 'ban', comment });
                                  setOpenMenuId(null);
                                }}
                              >
                                <Ban size={14} /> Ban author
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={styles.commentBody}>
                    {contentTypeIcon && (
                      <span className={styles.contentTypeBadge}>
                        {contentTypeIcon}
                        {comment.content_type}
                      </span>
                    )}
                    <p className={styles.commentText}>{comment.content}</p>

                    {comment.media_url && (
                      <div className={styles.commentMedia}>
                        <img src={comment.media_url} alt="Comment media" loading="lazy" />
                      </div>
                    )}
                  </div>

                  {/* Post context */}
                  {comment.post && comment.post.content && (
                    <div className={styles.postContext}>
                      <span className={styles.postContextLabel}>On post:</span>
                      <p className={styles.postContextText}>
                        {comment.post.content.substring(0, 150)}
                        {comment.post.content.length > 150 ? '...' : ''}
                      </p>
                    </div>
                  )}

                  {hasReports && (
                    <div className={styles.reportWarning}>
                      <AlertTriangle size={12} />
                      <span>
                        This comment has {comment.report_count} report{comment.report_count > 1 ? 's' : ''}
                      </span>
                    </div>
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

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmAction?.type === 'hide'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleHide(confirmAction.comment)}
        title="Hide this comment?"
        description="The comment will be hidden from all users but not deleted."
        confirmText="Hide Comment"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={confirmAction?.type === 'unhide'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleHide(confirmAction.comment)}
        title="Unhide this comment?"
        description="The comment will be visible to all users again."
        confirmText="Unhide"
        variant="info"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleDelete(confirmAction.comment)}
        title="Delete this comment?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={confirmAction?.type === 'flag'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleFlag(confirmAction.comment)}
        title="Flag this comment?"
        description="The comment will be marked for review by the moderation team."
        confirmText="Flag"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={confirmAction?.type === 'ban'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          toast.info('Ban action', 'Go to user profile to ban');
          setConfirmAction(null);
        }}
        title="Ban this author?"
        description="This action requires confirmation from the user detail page."
        confirmText="Continue"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
