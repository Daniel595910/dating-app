import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Heart, MessageCircle, Share2, MoreHorizontal, Flag, Ban, RotateCcw, BadgeCheck, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CommunityPost } from '../types/community.types';
import { VideoPlayerControls } from './VideoPlayerControls';
import { CommentSheet } from './CommentSheet';
import { ShareSheet } from './ShareSheet';
import { ReportSheet } from './ReportSheet';
import { BlockConfirmSheet } from './BlockConfirmSheet';
import styles from '../styles/CommunityVideoModal.module.css';
import { useWatchedVideos } from '../hooks/useWatchedVideos';

interface CommunityVideoModalProps {
  open: boolean;
  onClose: () => void;
  posts?: CommunityPost[];
  initialPostId?: string;
  initialVideoUrl?: string;
  onNeedMorePosts?: () => void;
  post?: CommunityPost;
  videoUrl?: string;
  startTimeSeconds?: number;
  onTimeUpdate?: (seconds: number) => void;
  currentUserId: string;
  onLike: (postId: string) => void;
}

export function CommunityVideoModal({
  open,
  onClose,
  posts,
  initialPostId,
  initialVideoUrl,
  onNeedMorePosts,
  post: legacyPost,
  videoUrl: legacyVideoUrl,
  startTimeSeconds = 0,
  onTimeUpdate,
  currentUserId,
  onLike,
}: CommunityVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [currentPostId, setCurrentPostId] = useState<string | null>(initialPostId ?? legacyPost?.id ?? null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(initialVideoUrl ?? legacyVideoUrl ?? null);
  const [swipeState, setSwipeState] = useState({ startX: 0, deltaX: 0, isDragging: false });
  const [atEnd, setAtEnd] = useState(false);

  const { watched, markWatched, startPlayTimer, clearPlayTimer } = useWatchedVideos();
  const navigate = useNavigate();

  const allPosts = posts ?? (legacyPost ? [legacyPost] : []);
  const currentPost = allPosts.find((p) => p.id === currentPostId) ?? legacyPost ?? allPosts[0];
  const isOwnPost = currentPost?.author.id === currentUserId;

  // Find the video's stored thumbnail if any
  const currentVideoMedia = currentPost?.media.find(
    (m) => m.type === 'video' && m.url === currentVideoUrl
  );
  const currentPosterUrl = currentVideoMedia?.thumbnailUrl;

  // Set start time on mount / when open changes
  useEffect(() => {
    if (!open) return;
    setShowReplay(false);
    const video = videoRef.current;
    if (!video) return;
    // Set currentTime after metadata is ready
    const applyStartTime = () => {
      if (startTimeSeconds > 0) {
        try {
          video.currentTime = startTimeSeconds;
        } catch {
          // Ignore — some browsers reject if metadata not ready
        }
      }
      video.play().catch(() => {});
    };
    if (video.readyState >= 1) {
      applyStartTime();
    } else {
      video.addEventListener('loadedmetadata', applyStartTime, { once: true });
    }
  }, [open, currentVideoUrl, startTimeSeconds]);

  // Play/pause tracking → mark watched after 3s
  useEffect(() => {
    if (!open || !currentPost) return;
    const video = videoRef.current;
    if (!video) return;
    const handlePlay = () => startPlayTimer(currentPost.id);
    const handlePause = () => clearPlayTimer();
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      clearPlayTimer();
    };
  }, [open, currentPost?.id, startPlayTimer, clearPlayTimer]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't close if a nested sheet is open
        if (commentSheetOpen || shareSheetOpen || reportSheetOpen || blockSheetOpen) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, commentSheetOpen, shareSheetOpen, reportSheetOpen, blockSheetOpen]);

  // On close, propagate current playback time back to parent
  const handleClose = useCallback(() => {
    clearPlayTimer();
    const video = videoRef.current;
    if (video && onTimeUpdate) {
      onTimeUpdate(video.currentTime);
    }
    onClose();
  }, [onClose, onTimeUpdate, clearPlayTimer]);

  // Video ended → show replay
  const handleEnded = () => {
    if (currentPost) markWatched(currentPost.id);
    clearPlayTimer();
    setShowReplay(true);
  };

  const handleReplay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
    setShowReplay(false);
  };

  const handleVideoTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (e.target !== e.currentTarget) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  // Backdrop click closes
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Like toggle — call parent's onLike
  const handleLike = () => {
    if (currentPost) onLike(currentPost.id);
  };

  const handleComment = () => {
    setCommentSheetOpen(true);
  };

  const handleShare = () => {
    setShareSheetOpen(true);
  };

  const getVideoPosts = () => {
    const allVideoPosts = allPosts.filter((p) => p.media.some((m) => m.type === 'video'));
    const unwatched = allVideoPosts.filter((p) => !watched.has(p.id) || p.id === currentPostId);
    return unwatched.length > 0 ? unwatched : allVideoPosts;
  };

  const navigateToPost = (targetPost: CommunityPost) => {
    clearPlayTimer();
    const videoMedia = targetPost.media.find((m) => m.type === 'video');
    if (!videoMedia) return;
    setCurrentPostId(targetPost.id);
    setCurrentVideoUrl(videoMedia.url);
    setAtEnd(false);
    setShowReplay(false);
  };

  const handleNext = () => {
    if (!currentPost) return;
    const videoPosts = getVideoPosts();
    const idx = videoPosts.findIndex((p) => p.id === currentPost.id);
    if (idx >= 0 && idx < videoPosts.length - 1) {
      navigateToPost(videoPosts[idx + 1]!);
      if (idx >= videoPosts.length - 3 && onNeedMorePosts) onNeedMorePosts();
    } else if (idx === videoPosts.length - 1) {
      setAtEnd(true);
    }
  };

  const handlePrev = () => {
    if (!currentPost) return;
    setAtEnd(false);
    const videoPosts = getVideoPosts();
    const idx = videoPosts.findIndex((p) => p.id === currentPost.id);
    if (idx > 0) {
      navigateToPost(videoPosts[idx - 1]!);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setSwipeState({ startX: e.clientX, deltaX: 0, isDragging: true });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeState.isDragging) return;
    setSwipeState((prev) => ({ ...prev, deltaX: e.clientX - prev.startX }));
  };

  const handlePointerUp = () => {
    if (!swipeState.isDragging) return;
    const threshold = 50;
    if (swipeState.deltaX < -threshold) handleNext();
    else if (swipeState.deltaX > threshold) handlePrev();
    setSwipeState({ startX: 0, deltaX: 0, isDragging: false });
  };

  if (!open) return null;

  const formattedDate = currentPost?.createdAt ? new Date(currentPost.createdAt).toLocaleDateString() : '';

  if (!currentPost) return null;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Mobile: fullscreen video overlay */}
        {/* Desktop: two-column — video left, context right */}

        {/* Close button — visible on both */}
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close video"
        >
          <X size={22} />
        </button>

        {/* Video pane */}
        <div
          className={styles.videoPane}
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <video
            ref={videoRef}
            src={currentVideoUrl ?? ''}
            poster={currentPosterUrl}
            playsInline
            autoPlay
            onEnded={handleEnded}
            onClick={handleVideoTap}
            className={styles.videoElement}
          />
          <VideoPlayerControls videoRef={videoRef} containerRef={containerRef} hideFullscreen={true} />

          {/* Replay overlay */}
          {showReplay && (
            <div className={styles.replayOverlay}>
              <button className={styles.replayButton} onClick={handleReplay} aria-label="Replay video">
                <RotateCcw size={32} />
                <span>Replay</span>
              </button>
            </div>
          )}

          {/* Caught up overlay — appears when user reaches end of video queue */}
          {atEnd && !showReplay && (
            <div className={styles.caughtUpOverlay}>
              <div className={styles.caughtUpCard}>
                <h3 className={styles.caughtUpTitle}>You've watched all videos here</h3>
                <p className={styles.caughtUpText}>
                  Explore fresh videos from the Discover feed
                </p>
                <div className={styles.caughtUpActions}>
                  <button
                    type='button'
                    className={styles.caughtUpPrimary}
                    onClick={() => { onClose(); navigate('/discover'); }}
                  >
                    Explore Videos
                  </button>
                  <button
                    type='button'
                    className={styles.caughtUpSecondary}
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Context pane — desktop side panel, mobile overlay bottom */}
        <div className={styles.contextPane}>
          {/* Author row */}
          <div className={styles.authorRow}>
            <div className={styles.avatar}>
              {currentPost.author.avatarUrl ? (
                <img src={currentPost.author.avatarUrl} alt={currentPost.author.name} />
              ) : (
                currentPost.author.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{currentPost.author.name}</span>
                {currentPost.author.verified && <BadgeCheck size={14} className={styles.verifiedIcon} />}
              </div>
              <div className={styles.metaRow}>
                {currentPost.author.location && (
                  <span className={styles.locationRow}>
                    <MapPin size={10} />
                    <span>{currentPost.author.location}</span>
                  </span>
                )}
                <span className={styles.timeAgo}>{formattedDate}</span>
              </div>
            </div>
            <button
              className={styles.moreButton}
              onClick={() => setShowMenu(!showMenu)}
              aria-label="More options"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => { setReportSheetOpen(true); setShowMenu(false); }}
                >
                  <Flag size={14} /> Report
                </button>
                {!isOwnPost && (
                  <button
                    className={styles.dropdownItemDanger}
                    onClick={() => { setBlockSheetOpen(true); setShowMenu(false); }}
                  >
                    <Ban size={14} /> Block
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Caption */}
          {currentPost.content && (
            <p className={styles.content}>{currentPost.content}</p>
          )}

          {/* Tags */}
          {currentPost.tags.length > 0 && (
            <div className={styles.tagsRow}>
              {currentPost.tags.map((tag, i) => (
                <span key={i} className={styles.tag}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className={styles.actionsDivider} />
          <div className={styles.actionsBar}>
            <button
              className={`${styles.actionButton} ${currentPost.viewer.liked ? styles.actionButtonLiked : ''}`}
              onClick={handleLike}
              aria-label={currentPost.viewer.liked ? 'Unlike' : 'Like'}
            >
              <Heart size={20} fill={currentPost.viewer.liked ? 'currentColor' : 'none'} />
              <span>{currentPost.stats.likes}</span>
            </button>
            <button
              className={styles.actionButton}
              onClick={handleComment}
              aria-label="Comments"
            >
              <MessageCircle size={20} />
              <span>{currentPost.stats.comments}</span>
            </button>
            <button
              className={styles.actionButton}
              onClick={handleShare}
              aria-label="Share"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Reused sheets */}
      <CommentSheet
        open={commentSheetOpen}
        onClose={() => setCommentSheetOpen(false)}
        postId={currentPost.id}
        userId={currentUserId}
      />

      <ShareSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        postUrl={typeof window !== 'undefined' ? window.location.origin + '/post/' + currentPost.id : ''}
      />

      <ReportSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        reporterId={currentUserId}
        targetType="post"
        targetId={currentPost.id}
        reportedUserId={currentPost.author.id}
      />

      <BlockConfirmSheet
        open={blockSheetOpen}
        onClose={() => setBlockSheetOpen(false)}
        blockerId={currentUserId}
        targetUserId={currentPost.author.id}
        targetUserName={currentPost.author.name}
        onBlocked={() => setBlockSheetOpen(false)}
      />
    </div>
  );
}
