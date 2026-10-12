import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,

  Eye,
  EyeOff,
  Trash2,
  Ban,
  FileText,
  Flag,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ExternalLink,

} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { contentService, PostRecord, ContentFilters } from '@/services/content.service';
import styles from './ModerationPage.module.css';

const PAGE_SIZE = 20;

export const ModerationPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentFilters['status']>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete' | 'ban';
    postId: string;
    authorId: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadPosts = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const result = await contentService.getPosts({
        search: debouncedSearch,
        status: statusFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      setPosts(result.items);
      setTotal(result.total);
    } catch (err: any) {
      toast.error('Failed to load posts', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, page, toast]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts(false);
    toast.success('Refreshed');
  };

  const handleHide = async (postId: string, currentlyHidden: boolean) => {
    try {
      await contentService.hidePost(postId, !currentlyHidden);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_hidden: !currentlyHidden } : p
        )
      );
      toast.success(currentlyHidden ? 'Post unhidden' : 'Post hidden');
    } catch (err: any) {
      toast.error('Action failed', err.message);
    }
    setOpenMenuId(null);
  };

  const handleDelete = async (postId: string) => {
    try {
      await contentService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Post deleted');
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    }
    setOpenMenuId(null);
    setConfirmAction(null);
  };

  const handleBan = async (userId: string) => {
    try {
      await contentService.banAuthor(userId, 'Content policy violation');
      toast.success('User banned');
    } catch (err: any) {
      toast.error('Ban failed', err.message);
    }
    setConfirmAction(null);
  };

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

  const getPostMedia = (media: any): string | null => {
    if (!media) return null;
    if (Array.isArray(media) && media.length > 0) {
      const first = media[0];
      return first?.url || first?.thumbnailUrl || first?.imageUrl || null;
    }
    if (typeof media === 'object') {
      return media.url || media.thumbnailUrl || media.imageUrl || null;
    }
    return null;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Content Moderation</h1>
          <p className={styles.subtitle}>
            {total > 0 ? `${total.toLocaleString()} posts` : 'Review and moderate user posts'}
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

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterTabs}>
          {(['all', 'visible', 'hidden', 'deleted'] as const).map((status) => (
            <button
              key={status}
              className={`${styles.filterTab} ${statusFilter === status ? styles.filterTabActive : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' && 'All'}
              {status === 'visible' && 'Visible'}
              {status === 'hidden' && 'Hidden'}
              {status === 'deleted' && 'Deleted'}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      {loading ? (
        <Loader fullScreen text="Loading posts..." />
      ) : posts.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<FileText size={32} />}
            title={debouncedSearch ? 'No matching posts' : 'No posts'}
            description={
              debouncedSearch
                ? `No posts match "${debouncedSearch}"`
                : statusFilter === 'all'
                ? 'No posts have been created yet.'
                : `No ${statusFilter} posts.`
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.postsGrid}>
            {posts.map((post) => {
              const mediaUrl = getPostMedia(post.media);
              const isHidden = post.is_hidden === true;
              const isDeleted = post.is_deleted === true;
              const hasReports = (post.report_count || 0) > 0;

              return (
                <div
                  key={post.id}
                  className={`${styles.postCard} ${isHidden ? styles.postCardHidden : ''} ${isDeleted ? styles.postCardDeleted : ''}`}
                >
                  {/* Header */}
                  <div className={styles.postHeader}>
                    <div className={styles.postAuthor}>
                      <Avatar
                        src={post.author?.avatar_url}
                        name={post.author?.display_name || 'User'}
                        size="sm"
                      />
                      <div className={styles.authorInfo}>
                        <div className={styles.authorNameRow}>
                          <span className={styles.authorName}>
                            {post.author?.display_name || 'Unknown User'}
                          </span>
                          {post.author?.is_verified && (
                            <span className={styles.verifiedBadge}>✓</span>
                          )}
                        </div>
                        <span className={styles.postTime}>
                          {timeAgo(post.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.postBadges}>
                      {hasReports && (
                        <Badge variant="error" size="sm">
                          <Flag size={10} /> {post.report_count}
                        </Badge>
                      )}
                      {isHidden && (
                        <Badge variant="warning" size="sm">
                          <EyeOff size={10} /> Hidden
                        </Badge>
                      )}
                      {isDeleted && (
                        <Badge variant="default" size="sm">
                          <Trash2 size={10} /> Deleted
                        </Badge>
                      )}
                    </div>

                    <div className={styles.menuWrapper}>
                      <button
                        className={styles.menuButton}
                        onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === post.id && (
                        <>
                          <div
                            className={styles.menuOverlay}
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className={styles.menu}>
                            <button
                              className={styles.menuItem}
                              onClick={() => {
                                navigate(`/users/${post.author_id}`);
                                setOpenMenuId(null);
                              }}
                            >
                              <ExternalLink size={14} />
                              View author
                            </button>

                            {hasPermission('CONTENT_MODERATE') && !isDeleted && (
                              <button
                                className={styles.menuItem}
                                onClick={() => handleHide(post.id, isHidden)}
                              >
                                {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                {isHidden ? 'Unhide post' : 'Hide post'}
                              </button>
                            )}

                            {hasPermission('CONTENT_DELETE') && !isDeleted && (
                              <button
                                className={`${styles.menuItem} ${styles.menuItemWarning}`}
                                onClick={() => {
                                  setConfirmAction({
                                    type: 'delete',
                                    postId: post.id,
                                    authorId: post.author_id,
                                  });
                                  setOpenMenuId(null);
                                }}
                              >
                                <Trash2 size={14} />
                                Delete post
                              </button>
                            )}

                            {hasPermission('USER_BAN') && (
                              <button
                                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                onClick={() => {
                                  setConfirmAction({
                                    type: 'ban',
                                    postId: post.id,
                                    authorId: post.author_id,
                                  });
                                  setOpenMenuId(null);
                                }}
                              >
                                <Ban size={14} />
                                Ban author
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={styles.postContent}>
                    {post.content && (
                      <p className={styles.postText}>{post.content}</p>
                    )}

                    {mediaUrl && (
                      <div className={styles.postMedia}>
                        <img src={mediaUrl} alt="Post media" loading="lazy" />
                      </div>
                    )}
                  </div>
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
        open={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) void handleDelete(confirmAction.postId); }}
        title="Delete this post?"
        description="The post will be hidden from all users. This can be reversed from the database."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={confirmAction?.type === 'ban'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) void handleBan(confirmAction.authorId); }}
        title="Ban this author?"
        description="The user will lose access to the platform. This action is logged."
        confirmText="Ban User"
        variant="danger"
        requireTyping="BAN"
      />
    </div>
  );
};
