import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useCommunity } from '../../features/community/hooks/useCommunity';
import { useCommunityFeed } from '../../features/community/hooks/useCommunityFeed';
import { usePostInteractions } from '../../features/community/hooks/usePostInteractions';
import { useCommunityRealtime } from '../../features/community/hooks/useCommunityRealtime';
import { usePullToRefresh } from '../../features/community/hooks/usePullToRefresh';
import { useConnection } from '../../features/community/hooks/useConnection';
import { CommunityHeader } from '../../features/community/components/CommunityHeader';
import { FilterBar } from '../../features/community/components/FilterBar';
import { CommunityPostCard } from '../../features/community/components/CommunityPostCard';
import { CreatePostButton } from '../../features/community/components/CreatePostSheet';
import { CreatePostForm } from '../../features/community/components/CreatePostForm';
import { CommunitySkeleton } from '../../features/community/components/CommunitySkeleton';
import { CommunityEmptyState } from '../../features/community/components/CommunityEmptyState';
import { FeedErrorState } from '../../features/community/components/FeedErrorState';
import { InfiniteScrollSentinel } from '../../features/community/components/InfiniteScrollSentinel';
import { CommentSheet } from '../../features/community/components/CommentSheet';
import { ProfilePreviewSheet } from '../../features/community/components/ProfilePreviewSheet';
import { ConnectionPrompt } from '../../features/community/components/ConnectionPrompt';
import { MatchSuccess } from '../../features/community/components/MatchSuccess';
import { PendingRequests } from '../../features/community/components/PendingRequests';
import { ConnectionStatus } from '../../features/community/components/ConnectionStatus';
import { BottomNav } from '../../features/community/components/BottomNav';
import { FeedFilter, CommunityPostType } from '../../features/community/types/community.types';
import styles from '../../features/community/styles/CommunityPage.module.css';

export const CommunityPage: React.FC = () => {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [previewAuthorId, setPreviewAuthorId] = useState<string | null>(null);
  const [connectionTarget, setConnectionTarget] = useState<{ id: string; name: string } | null>(null);
  const [matchUser, setMatchUser] = useState<string | null>(null);
  const [newPostCount, setNewPostCount] = useState(0);

  const { community, loading: communityLoading, onlineCount } = useCommunity(user?.id || null);

  const {
    posts,
    loading: feedLoading,
    loadingMore,
    hasMore,
    error: feedError,
    refresh,
    loadMore,
    updatePost,
    removePost,
  } = useCommunityFeed({
    communityId: community?.id || null,
    userId: user?.id || null,
    filter,
  });

  const { likePost } = usePostInteractions(user?.id || null);
  const { pendingRequests, acceptRequest, rejectRequest } = useConnection({ userId: user?.id || null });

  const pullToRefresh = usePullToRefresh({ onRefresh: refresh, disabled: feedLoading });

  useCommunityRealtime({
    communityId: community?.id || null,
    onNewPost: () => setNewPostCount((prev) => prev + 1),
    onPostDeleted: (postId) => removePost(postId),
  });

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const currentlyLiked = post.viewer.liked;
    const currentCount = post.stats.likes;
    updatePost(postId, {
      viewer: { ...post.viewer, liked: !currentlyLiked },
      stats: { ...post.stats, likes: currentlyLiked ? currentCount - 1 : currentCount + 1 },
    });
    try {
      await likePost(postId, currentlyLiked, currentCount);
    } catch {
      updatePost(postId, {
        viewer: { ...post.viewer, liked: currentlyLiked },
        stats: { ...post.stats, likes: currentCount },
      });
    }
  };

  const handleGetToKnow = (targetUserId: string) => {
    if (targetUserId === user?.id) return;
    const post = posts.find((p) => p.author.id === targetUserId);
    setConnectionTarget({ id: targetUserId, name: post?.author.name || 'this person' });
  };

  if (communityLoading) return <CommunitySkeleton />;
  if (!community) {
    return (
      <div className={styles.communityPage}>
        <div className={styles.errorContainer}>
          <h2 className={styles.errorTitle}>No Community Assigned</h2>
          <p className={styles.errorMessage}>Complete your location verification to be assigned to your regional dating community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.communityPage}>
      <CommunityHeader community={{ ...community, onlineCount }} onSearch={() => { window.location.href = '/search'; }} onMore={() => {}} />
      <FilterBar activeFilter={filter} onFilterChange={setFilter} />

      {newPostCount > 0 && (
        <button className={styles.newPostsIndicator} onClick={() => { setNewPostCount(0); refresh(); }}>
          ↑ {newPostCount} new posts
        </button>
      )}

      <main className={styles.feedContainer}>
        {/* Pending Connection Requests */}
        <PendingRequests
          requests={pendingRequests.map((r) => ({ id: r.id, requesterName: r.requesterName, message: r.message }))}
          onAccept={acceptRequest}
          onReject={rejectRequest}
        />

        {feedLoading && posts.length === 0 ? (
          <CommunitySkeleton />
        ) : feedError && posts.length === 0 ? (
          <FeedErrorState onRetry={refresh} />
        ) : posts.length === 0 ? (
          <CommunityEmptyState onCreatePost={() => setCreateSheetOpen(true)} filter={filter} />
        ) : (
          <>
            {posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id || ''}
                onLike={handleLike}
                onComment={(postId) => setCommentPostId(postId)}
                onShare={() => {}}
                onProfileClick={(authorId) => setPreviewAuthorId(authorId)}
              />
            ))}
            <InfiniteScrollSentinel onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
          </>
        )}
      </main>

      <CreatePostButton onClick={() => setCreateSheetOpen(true)} />
      <BottomNav />

      <CommentSheet open={Boolean(commentPostId)} onClose={() => setCommentPostId(null)} postId={commentPostId || ''} userId={user?.id || ''} />
      <ProfilePreviewSheet open={Boolean(previewAuthorId)} onClose={() => setPreviewAuthorId(null)} authorId={previewAuthorId} onGetToKnow={(id) => { setPreviewAuthorId(null); handleGetToKnow(id); }} onViewFullProfile={(id) => { setPreviewAuthorId(null); window.location.href = `/profile/${id}`; }} />
      <ConnectionPrompt open={Boolean(connectionTarget)} onClose={() => setConnectionTarget(null)} targetUserId={connectionTarget?.id || ''} targetUserName={connectionTarget?.name || ''} currentUserId={user?.id || ''} />
      <MatchSuccess open={Boolean(matchUser)} onClose={() => setMatchUser(null)} matchedUserName={matchUser || ''} onStartChat={() => { setMatchUser(null); window.location.href = '/chats'; }} />
      <CreatePostForm open={createSheetOpen} onClose={() => setCreateSheetOpen(false)} communityId={community.id} userId={user?.id || ''} onPostCreated={() => refresh()} />
    </div>
  );
};

