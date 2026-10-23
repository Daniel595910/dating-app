import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useCommunity } from '../../features/community/hooks/useCommunity';
import { useCommunityFeed } from '../../features/community/hooks/useCommunityFeed';
import { usePostInteractions } from '../../features/community/hooks/usePostInteractions';
import { useCommunityRealtime } from '../../features/community/hooks/useCommunityRealtime';
import { usePullToRefresh } from '../../features/community/hooks/usePullToRefresh';
import { useConnection } from '../../features/community/hooks/useConnection';
import { useOfflineFeed } from '../../features/community/hooks/useOfflineFeed';
import { CommunityHeader } from '../../features/community/components/CommunityHeader';
import { MembersModal } from '../../features/community/components/MembersModal';
import { communityService } from '../../features/community/services/community.service';
import { FilterBar } from '../../features/community/components/FilterBar';
import { CommunityPostCard } from '../../features/community/components/CommunityPostCard';
import { CreatePostButton } from '../../features/community/components/CreatePostSheet';
import { CreatePostForm } from '../../features/community/components/CreatePostForm';
import { CommunitySkeleton } from '../../features/community/components/CommunitySkeleton';
import { CommunityEmptyState } from '../../features/community/components/CommunityEmptyState';
import { FeedErrorState } from '../../features/community/components/FeedErrorState';
import { InfiniteScrollSentinel } from '../../features/community/components/InfiniteScrollSentinel';
import { CommentSheet } from '../../features/community/components/CommentSheet';
import { ProfileSwipeDeck } from '../../features/community/components/ProfileSwipeDeck';
import { ProfilePreviewSheet } from '../../features/community/components/ProfilePreviewSheet';
import { ConnectionPrompt } from '../../features/community/components/ConnectionPrompt';
import { MatchSuccess } from '../../features/community/components/MatchSuccess';
import { PendingRequests } from '../../features/community/components/PendingRequests';
import { ConnectionsModal } from '../../features/community/components/ConnectionsModal';
import { BottomNav } from '../../features/community/components/BottomNav';
import { LocationSetupSheet } from '../../features/community/components/LocationSetupSheet';
import { OfflineBanner } from '../../features/community/components/OfflineBanner';
import { CommunitySwitcher } from '../../features/community/components/CommunitySwitcher';
import { FeedFilter } from '../../features/community/types/community.types';
import styles from '../../features/community/styles/CommunityPage.module.css';

export const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  useLocation(); // retain router context

  const { user } = useAuthStore();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [previewAuthorId, setPreviewAuthorId] = useState<string | null>(null);
  const [connectionTarget, setConnectionTarget] = useState<{ id: string; name: string } | null>(null);
  const [matchUser, setMatchUser] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [newPostCount, setNewPostCount] = useState(0);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [connectionsModalOpen, setConnectionsModalOpen] = useState(false);
  const [memberPreview, setMemberPreview] = useState<Array<{ userId: string; name: string; avatarUrl: string | null }>>([]);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [allowConnections, setAllowConnections] = useState(true);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [memberPreviewCommunityId, setMemberPreviewCommunityId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('postId');

    if (postId) {
      setCommentPostId(postId);
      window.history.replaceState({}, '', '/community');
    }
  }, []);

  const {
    community,
    loading: communityLoading,
    onlineCount,
    setSelectedCommunity,
  } = useCommunity(user?.id || null);

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

  const {
    pendingRequests,
    activeConnections,
    matchedConnections,
    likesReceived,
    loading: connectionLoading,
    acceptRequest,
    declineRequest,
    sendRequest,
    expressInterest,
    getOrCreateConversation,
    unmatch,
    likeBack,
    skipLike,
  } = useConnection(user?.id || null);

  // Pull-to-refresh: after refresh completes, clear banner + scroll to top.
  const pull = usePullToRefresh({
    onRefresh: async () => {
      await refresh();
      setNewPostCount(0);
      pull.containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    disabled: feedLoading,
  });

  const { isOffline, hasCachedFeed } = useOfflineFeed({
    communityId: community?.id || null,
  });

  useCommunityRealtime({
    communityId: community?.id || null,
    onNewPost: (post) => {
      // Skip own posts — user just posted it, banner would be noise
      if (post?.author_id !== user?.id) {
        setNewPostCount((prev) => prev + 1);
      }
    },
    onPostDeleted: (postId) => removePost(postId),
    onPostUpdated: (post) => {
      // Triggers increment/decrement posts.like_count and posts.comment_count,
      // which fires realtime UPDATE on posts. Sync those into the UI.
      updatePost(post.id, {
        stats: {
          likes: post.like_count || 0,
          comments: post.comment_count || 0,
          shares: 0,
        },
      });
    },
  });

  // Load community member preview + allow_connections flag
  useEffect(() => {
    if (!community?.id || !user?.id) return;

    const targetCommunityId = community.id;
    let cancelled = false;

    setMemberPreviewCommunityId(targetCommunityId);
    setMemberPreview([]);

    Promise.all([
      communityService.getConnectedUserIds(user.id),
      communityService.getCommunityById(targetCommunityId),
    ])
      .then(async ([connected, full]) => {
        if (cancelled) return;

        const preview = await communityService.getCommunityMembersPreview(
          targetCommunityId,
          [user.id],
          5
        );

        if (cancelled) return;

        setConnectedIds(connected);
        setMemberPreview(preview);
        setAllowConnections(full?.allow_member_connections !== false);
      })
      .catch(() => {
        if (cancelled) return;
        setMemberPreview([]);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community?.id, user?.id]);

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

  const handleExpressInterest = async (matchId: string) => {
    const result = await expressInterest(matchId);
    if (result?.isMatched) {
      setMatchId(matchId);
      setMatchUser('your match');
    }
  };

  const handleStartChat = async () => {
    if (!matchId) return;
    const conversationId = await getOrCreateConversation(matchId);
    if (conversationId) {
      setMatchUser(null);
      setMatchId(null);
      navigate(/chats/);
    }
  };

  const handleSwitchCommunity = (communityId: string) => {
    setSwitcherOpen(false);
    setSelectedCommunity(communityId);
  };

  if (communityLoading) return <CommunitySkeleton />;

  if (!community) {
    return (
      <div className={styles.communityPage}>
        <div className={styles.errorContainer}>
          <h2 className={styles.errorTitle}>No Community Assigned</h2>
          <p className={styles.errorMessage}>
            Set your location to be assigned to your regional dating community.
          </p>
          <button className={styles.retryButton} onClick={() => setLocationSheetOpen(true)}>
            Set My Location
          </button>
        </div>
        <LocationSetupSheet
          open={locationSheetOpen}
          onClose={() => setLocationSheetOpen(false)}
          userId={user?.id || ''}
          onLocationSaved={() => {
            setLocationSheetOpen(false);
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.communityPage}>
      <OfflineBanner isOffline={isOffline} hasCachedFeed={hasCachedFeed} />

      <CommunityHeader
        community={{ ...community, onlineCount }}
        userId={user?.id || ''}
        onSearch={() => navigate('/search')}
        onMore={() => {}}
        onSwitchCommunity={() => setSwitcherOpen(true)}
        onDiscover={() => navigate('/discover-communities')}
        memberPreview={memberPreview}
        memberPreviewCommunityId={memberPreviewCommunityId}
        onOpenMembers={() => setMembersModalOpen(true)}
        connectionCount={activeConnections.length + pendingRequests.length}
        onOpenConnections={() => setConnectionsModalOpen(true)}
      />

      <FilterBar activeFilter={filter} onFilterChange={setFilter} />

      {newPostCount > 0 && (
        <button
          className={styles.newPostsIndicator}
          onClick={async () => {
            setNewPostCount(0);
            await refresh();
            pull.containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          {newPostCount} new posts
        </button>
      )}

      {(pull.pulling || pull.refreshing) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '0.5rem',
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: '#ef4444',
            background: 'rgba(255,255,255,0.95)',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {pull.refreshing ? 'Refreshing...' : `Pull to refresh (${Math.round(pull.pullDistance)}px)`}
        </div>
      )}

      <main
        ref={pull.containerRef as React.RefObject<HTMLElement>}
        className={styles.feedContainer}
      >
        {filter === 'profiles' ? (
          <ProfileSwipeDeck userId={user?.id || ''} communityId={community.id} onGetToKnow={(id) => handleGetToKnow(id)} />
        ) : feedLoading && posts.length === 0 ? (
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

      <CommunitySwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        userId={user?.id || ''}
        currentCommunityId={community.id}
        onSwitch={handleSwitchCommunity}
      />

      <BottomNav />

      <CommentSheet
        open={Boolean(commentPostId)}
        onClose={() => setCommentPostId(null)}
        postId={commentPostId || ''}
        userId={user?.id || ''}
      />

      <ProfilePreviewSheet
        open={Boolean(previewAuthorId)}
        onClose={() => setPreviewAuthorId(null)}
        authorId={previewAuthorId}
        currentUserId={user?.id || ''}
        onGetToKnow={(id) => { setPreviewAuthorId(null); handleGetToKnow(id); }}
        onViewFullProfile={(id) => { setPreviewAuthorId(null); navigate(`/profile/${id}`); }}
      />

      <ConnectionPrompt
        open={Boolean(connectionTarget)}
        onClose={() => setConnectionTarget(null)}
        targetUserId={connectionTarget?.id || ''}
        targetUserName={connectionTarget?.name || ''}
        onSendRequest={sendRequest}
      />

      <ConnectionsModal
        open={connectionsModalOpen}
        onClose={() => setConnectionsModalOpen(false)}
        outgoing={activeConnections}
        incoming={pendingRequests}
        onExpressInterest={handleExpressInterest}
        onAccept={acceptRequest}
        onDecline={declineRequest}
        matched={matchedConnections}
        likes={likesReceived}
        onUnmatch={unmatch}
        onLikeBack={likeBack}
        onSkipLike={skipLike}
        onViewProfile={(userId) => navigate('/profile/' + userId)}
        onOpenChat={async (matchId) => {
          const convId = await getOrCreateConversation(matchId);
          if (convId) {
            setConnectionsModalOpen(false);
            navigate('/chats/' + convId);
          }
        }}
        loading={connectionLoading}
      />

      <MembersModal
        open={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        members={memberPreview}
        allowConnections={allowConnections}
        connectedUserIds={connectedIds}
        onViewProfile={(userId) => {
          setMembersModalOpen(false);
          navigate('/profile/' + userId);
        }}
        onGetToKnow={async (userId) => {
          setConnectingUserId(userId);
          try {
            const ok = await sendRequest(userId);
            if (ok) {
              setMemberPreview((prev) => prev.filter((m) => m.userId !== userId));
            }
          } finally {
            setConnectingUserId(null);
          }
        }}
        loadingUserId={connectingUserId}
      />

      <MatchSuccess
        open={Boolean(matchUser)}
        onClose={() => { setMatchUser(null); setMatchId(null); }}
        matchedUserName={matchUser || ''}
        onStartChat={handleStartChat}
      />

      <CreatePostForm
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        communityId={community.id}
        userId={user?.id || ''}
        onPostCreated={() => refresh()}
      />
    </div>
  );
};
