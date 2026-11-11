import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, Search, RefreshCw, Image, Eye, Trash2, EyeOff, AlertTriangle,
  ChevronLeft, ChevronRight, X, ExternalLink, Heart, MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { postService, AdminPost, PostFilters } from '@/services/post.service';
import styles from './PhotoGalleryPage.module.css';

const PAGE_SIZE = 24;

type Tab = 'all' | 'reported' | 'hidden' | 'today';

export const PhotoGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [stats, setStats] = useState({ total: 0, withImages: 0, hidden: 0, reported: 0, today: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'hide' | 'unhide' | 'delete' | 'remove-image';
    post: AdminPost;
    imageIndex?: number;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const filters: PostFilters = {
        hasImages: true,
        search: debouncedSearch,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };

      if (activeTab === 'reported') filters.status = 'reported';
      else if (activeTab === 'hidden') filters.status = 'hidden';
      else if (activeTab === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filters.dateFrom = today.toISOString();
      }

      const [result, statsData] = await Promise.all([
        postService.getPosts(filters),
        postService.getStats(),
      ]);

      setPosts(result.items);
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

  const handleHide = async (post: AdminPost) => {
    setActionLoading(true);
    try {
      await postService.hidePost(post.id);
      toast.success('Post hidden');
      setConfirmAction(null);
      setSelectedPost(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Hide failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnhide = async (post: AdminPost) => {
    setActionLoading(true);
    try {
      await postService.unhidePost(post.id);
      toast.success('Post unhidden');
      setConfirmAction(null);
      setSelectedPost(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Unhide failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (post: AdminPost) => {
    setActionLoading(true);
    try {
      await postService.deletePost(post.id);
      toast.success('Post deleted');
      setConfirmAction(null);
      setSelectedPost(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveImage = async (post: AdminPost, imageIndex: number) => {
    setActionLoading(true);
    try {
      await postService.removeImage(post.id, imageIndex);
      toast.success('Image removed');
      setConfirmAction(null);
      const updated = post.images.filter((_, i) => i !== imageIndex);
      if (updated.length === 0) {
        setSelectedPost(null);
      } else {
        setSelectedPost({ ...post, images: updated });
        setSelectedImageIndex(Math.min(selectedImageIndex, updated.length - 1));
      }
      loadData(false);
    } catch (err: any) {
      toast.error('Remove image failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Post navigation
  const currentPostIndex = selectedPost ? posts.findIndex(p => p.id === selectedPost.id) : -1;
  const hasPrevPost = currentPostIndex > 0;
  const hasNextPost = currentPostIndex >= 0 && currentPostIndex < posts.length - 1;

  const goPrevPost = () => {
    if (!hasPrevPost) return;
    setSelectedPost(posts[currentPostIndex - 1]);
    setSelectedImageIndex(0);
  };

  const goNextPost = () => {
    if (!hasNextPost) return;
    setSelectedPost(posts[currentPostIndex + 1]);
    setSelectedImageIndex(0);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!selectedPost) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPost(null);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevPost();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNextPost();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedPost, currentPostIndex, posts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Photo Posts</h1>
          <p className={styles.subtitle}>
            {stats.withImages.toLocaleString()} photos across all communities
          </p>
        </div>
        <button className={styles.refreshButton} onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      <div className={styles.statsGrid}>
        <button
          className={`${styles.statCard} ${activeTab === 'all' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Camera size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>All Photos</p>
            <p className={styles.statValue}>{stats.withImages.toLocaleString()}</p>
          </div>
        </button>
        <button
          className={`${styles.statCard} ${activeTab === 'today' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Image size={22} />
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
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <AlertTriangle size={22} />
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
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <EyeOff size={22} />
          </div>
          <div>
            <p className={styles.statLabel}>Hidden</p>
            <p className={styles.statValue}>{stats.hidden.toLocaleString()}</p>
          </div>
        </button>
      </div>

      <div className={styles.searchWrapper}>
        <Search size={18} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by caption or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearButton} onClick={() => setSearch('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <Loader />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Camera size={48} />}
          title="No photo posts"
          description="No photo posts match your filters."
        />
      ) : (
        <div className={styles.grid}>
          {posts.map((post) => (
            <div
              key={post.id}
              className={styles.card}
              onClick={() => { setSelectedPost(post); setSelectedImageIndex(0); }}
            >
              {post.images.length > 0 && (
                <div className={styles.imageWrap}>
                  <img src={post.images[0]} alt="" loading="lazy" />
                  {post.images.length > 1 && (
                    <span className={styles.imageCount}>+{post.images.length - 1}</span>
                  )}
                  {post.report_count > 0 && (
                    <span className={styles.reportedBadge}>
                      <AlertTriangle size={12} /> {post.report_count}
                    </span>
                  )}
                  {post.is_hidden && <span className={styles.hiddenBadge}>Hidden</span>}
                </div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardAuthor}>
                  {post.author?.avatar_url ? (
                    <img src={post.author.avatar_url} alt="" className={styles.cardAvatar} />
                  ) : (
                    <div className={styles.cardAvatarFallback}>
                      {post.author?.display_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <span className={styles.cardAuthorName}>
                    {post.author?.display_name || 'Unknown'}
                  </span>
                </div>
                <div className={styles.cardStats}>
                  <span><Heart size={12} /> {post.like_count}</span>
                  <span><MessageSquare size={12} /> {post.comment_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
          <button
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {selectedPost && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPost(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedPost(null)}>
              <X size={20} />
            </button>

            {hasPrevPost && (
              <button
                className={`${styles.modalPostNav} ${styles.modalPostNavPrev}`}
                onClick={(e) => { e.stopPropagation(); goPrevPost(); }}
                aria-label="Previous post"
                title="Previous post (←)"
              >
                <ChevronLeft size={28} />
              </button>
            )}
            {hasNextPost && (
              <button
                className={`${styles.modalPostNav} ${styles.modalPostNavNext}`}
                onClick={(e) => { e.stopPropagation(); goNextPost(); }}
                aria-label="Next post"
                title="Next post (→)"
              >
                <ChevronRight size={28} />
              </button>
            )}

            <div className={styles.modalHeader}>
              <div className={styles.modalAuthor}>
                {selectedPost.author?.avatar_url ? (
                  <img src={selectedPost.author.avatar_url} alt="" />
                ) : (
                  <div className={styles.modalAvatarFallback}>
                    {selectedPost.author?.display_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className={styles.modalName}>{selectedPost.author?.display_name || 'Unknown'}</p>
                  <p className={styles.modalCommunity}>
                    {selectedPost.community?.name || 'Unknown community'}
                  </p>
                </div>
              </div>
              <button
                className={styles.modalViewUser}
                onClick={() => {
                  setSelectedPost(null);
                  navigate(`/users/${selectedPost.author_id}`);
                }}
              >
                View user <ExternalLink size={12} />
              </button>
            </div>

            {selectedPost.images.length > 0 && (
              <div className={styles.modalImageWrap}>
                <img src={selectedPost.images[selectedImageIndex]} alt="" />
                {selectedPost.images.length > 1 && (
                  <>
                    <button
                      className={styles.modalNav}
                      style={{ left: 12 }}
                      onClick={() => setSelectedImageIndex((i) => Math.max(0, i - 1))}
                      disabled={selectedImageIndex === 0}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      className={styles.modalNav}
                      style={{ right: 12 }}
                      onClick={() => setSelectedImageIndex((i) => Math.min(selectedPost.images.length - 1, i + 1))}
                      disabled={selectedImageIndex >= selectedPost.images.length - 1}
                    >
                      <ChevronRight size={20} />
                    </button>
                    <span className={styles.modalImageCount}>
                      {selectedImageIndex + 1} / {selectedPost.images.length}
                    </span>
                  </>
                )}
              </div>
            )}

            {selectedPost.content && (
              <p className={styles.modalContent}>{selectedPost.content}</p>
            )}

            <div className={styles.modalMeta}>
              <span><Heart size={14} /> {selectedPost.like_count} likes</span>
              <span><MessageSquare size={14} /> {selectedPost.comment_count} comments</span>
              <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
            </div>

            <div className={styles.modalActions}>
              {selectedPost.is_hidden ? (
                <Button variant="outline" onClick={() => setConfirmAction({ type: 'unhide', post: selectedPost })}>
                  <Eye size={14} /> Unhide Post
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setConfirmAction({ type: 'hide', post: selectedPost })}>
                  <EyeOff size={14} /> Hide Post
                </Button>
              )}
              {selectedPost.images.length > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction({ type: 'remove-image', post: selectedPost, imageIndex: selectedImageIndex })}
                >
                  <X size={14} /> Remove This Image
                </Button>
              )}
              {selectedPost.images.length > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction({ type: 'remove-image', post: selectedPost, imageIndex: selectedImageIndex })}
                >
                  <X size={14} /> Remove This Image
                </Button>
              )}
              <Button variant="danger" onClick={() => setConfirmAction({ type: 'delete', post: selectedPost })}>
                <Trash2 size={14} /> Delete Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          open
          title={
            confirmAction.type === 'hide' ? 'Hide post?' :
            confirmAction.type === 'unhide' ? 'Unhide post?' :
            confirmAction.type === 'delete' ? 'Delete post?' :
            'Remove this image?'
          }
          description={
            confirmAction.type === 'hide' ? 'The post will be hidden from users.' :
            confirmAction.type === 'unhide' ? 'The post will be visible again.' :
            confirmAction.type === 'delete' ? 'The post will be soft-deleted and hidden.' :
            'The selected image will be removed from the post. If it was the last image, the post will be hidden.'
          }
          confirmText={confirmAction.type === 'unhide' ? 'Unhide' : confirmAction.type === 'hide' ? 'Hide' : confirmAction.type === 'delete' ? 'Delete' : 'Remove'}
          loading={actionLoading}
          variant={confirmAction.type === 'delete' || confirmAction.type === 'remove-image' ? 'danger' : 'warning'}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.type === 'hide') handleHide(confirmAction.post);
            else if (confirmAction.type === 'unhide') handleUnhide(confirmAction.post);
            else if (confirmAction.type === 'delete') handleDelete(confirmAction.post);
            else if (confirmAction.type === 'remove-image' && confirmAction.imageIndex !== undefined) {
              handleRemoveImage(confirmAction.post, confirmAction.imageIndex);
            }
          }}
        />
      )}
    </div>
  );
};
