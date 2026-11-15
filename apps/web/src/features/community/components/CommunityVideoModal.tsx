import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Heart, MessageCircle, Share2, MoreHorizontal, Flag, Ban, RotateCcw, BadgeCheck, MapPin } from 'lucide-react';
import { CommunityPost } from '../types/community.types';
import { VideoPlayerControls } from './VideoPlayerControls';
import { CommentSheet } from './CommentSheet';
import { ShareSheet } from './ShareSheet';
import { ReportSheet } from './ReportSheet';
import { BlockConfirmSheet } from './BlockConfirmSheet';
import styles from '../styles/CommunityVideoModal.module.css';

interface CommunityVideoModalProps {
  open: boolean;
  onClose: () => void;
  post: CommunityPost;
  videoUrl: string;
  startTimeSeconds?: number;
  onTimeUpdate?: (seconds: number) => void;
  currentUserId: string;
  onLike: (postId: string) => void;
}

export function CommunityVideoModal({
  open,
  onClose,
  post,
  videoUrl,
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

  const isOwnPost = post.author.id === currentUserId;

  // Find the video's stored thumbnail if any
  const videoMedia = post.media.find((m) => m.type === 'video' && m.url === videoUrl);
  const posterUrl = videoMedia?.thumbnailUrl;

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
  }, [open, videoUrl, startTimeSeconds]);

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
    const video = videoRef.current;
    if (video && onTimeUpdate) {
      onTimeUpdate(video.currentTime);
    }
    onClose();
  }, [onClose, onTimeUpdate]);

  // Video ended → show replay
  const handleEnded = () => {
    setShowReplay(true);
  };

  const handleReplay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
    setShowReplay(false);
  };

  // Backdrop click closes
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Like toggle — call parent's onLike
  const handleLike = () => {
    onLike(post.id);
  };

  const handleComment = () => {
    setCommentSheetOpen(true);
  };

  const handleShare = () => {
    setShareSheetOpen(true);
  };

  if (!open) return null;

  const formattedDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '';

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
        <div className={styles.videoPane} ref={containerRef}>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl}
            playsInline
            autoPlay
            onEnded={handleEnded}
            className={styles.videoElement}
          />
          <VideoPlayerControls videoRef={videoRef} containerRef={containerRef} />

          {/* Replay overlay */}
          {showReplay && (
            <div className={styles.replayOverlay}>
              <button className={styles.replayButton} onClick={handleReplay} aria-label="Replay video">
                <RotateCcw size={32} />
                <span>Replay</span>
              </button>
            </div>
          )}
        </div>

        {/* Context pane — desktop side panel, mobile overlay bottom */}
        <div className={styles.contextPane}>
          {/* Author row */}
          <div className={styles.authorRow}>
            <div className={styles.avatar}>
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt={post.author.name} />
              ) : (
                post.author.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{post.author.name}</span>
                {post.author.verified && <BadgeCheck size={14} className={styles.verifiedIcon} />}
              </div>
              <div className={styles.metaRow}>
                {post.author.location && (
                  <span className={styles.locationRow}>
                    <MapPin size={10} />
                    <span>{post.author.location}</span>
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
          {post.content && (
            <p className={styles.content}>{post.content}</p>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className={styles.tagsRow}>
              {post.tags.map((tag, i) => (
                <span key={i} className={styles.tag}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className={styles.actionsDivider} />
          <div className={styles.actionsBar}>
            <button
              className={`${styles.actionButton} ${post.viewer.liked ? styles.actionButtonLiked : ''}`}
              onClick={handleLike}
              aria-label={post.viewer.liked ? 'Unlike' : 'Like'}
            >
              <Heart size={20} fill={post.viewer.liked ? 'currentColor' : 'none'} />
              <span>{post.stats.likes}</span>
            </button>
            <button
              className={styles.actionButton}
              onClick={handleComment}
              aria-label="Comments"
            >
              <MessageCircle size={20} />
              <span>{post.stats.comments}</span>
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
        postId={post.id}
        userId={currentUserId}
      />

      <ShareSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        postUrl={typeof window !== 'undefined' ? window.location.origin + '/post/' + post.id : ''}
      />

      <ReportSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        reporterId={currentUserId}
        targetType="post"
        targetId={post.id}
        reportedUserId={post.author.id}
      />

      <BlockConfirmSheet
        open={blockSheetOpen}
        onClose={() => setBlockSheetOpen(false)}
        blockerId={currentUserId}
        targetUserId={post.author.id}
        targetUserName={post.author.name}
        onBlocked={() => setBlockSheetOpen(false)}
      />
    </div>
  );
}
