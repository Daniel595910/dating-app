import React, { useState } from 'react';
import { Heart, MessageCircle, MapPin, BadgeCheck, MoreVertical, Share2, UserPlus, Check, Play, Pause, Mic } from 'lucide-react';
import { CommunityPost } from '../../types/community.types';
import { supabase } from '@/config/supabase.client';
import { ReportSheet } from './ReportSheet';
import { BlockConfirmSheet } from './BlockConfirmSheet';
import { ShareSheet } from './ShareSheet';
import { LookingForBadge } from './LookingForBadge';
import { PostMedia } from './PostMedia';
import { PostActions } from './PostActions';
import { ImagePreviewModal } from './ImagePreviewModal';
import styles from '../styles/CommunityPostCard.module.css';

interface CommunityPostCardProps {
  post: CommunityPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onProfileClick: (authorId: string) => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onProfileClick,
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const isOwnPost = post.author.id === currentUserId;
  const mediaUrls = post.media.map((m) => m.url);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (followLoading) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', post.author.id);
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: post.author.id });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <article className={styles.card}>
      {/* Author Row */}
      <div className={styles.authorRow}>
        <div className={styles.authorClickable} onClick={() => onProfileClick(post.author.id)}>
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
              {post.author.verified && <BadgeCheck size={15} className={styles.verifiedIcon} />}
            </div>
            {post.author.location && (
              <div className={styles.locationRow}>
                <MapPin size={10} />
                <span>{post.author.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnPost && (
          <button
            className={`${styles.followButton} ${isFollowing ? styles.followButtonActive : ''}`}
            onClick={handleFollow}
            disabled={followLoading}
          >
            {isFollowing ? <Check size={12} /> : <UserPlus size={12} />}
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}

        {/* More Button */}
        <button
          className={styles.moreButton}
          onClick={() => setActionMenuOpen(true)}
          aria-label="More options"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Looking For Badge */}
      {post.lookingFor && <LookingForBadge lookingFor={post.lookingFor} />}

      {/* Content */}
      {post.content && (
        <p className={styles.content}>{post.content}</p>
      )}

      {/* Voice/Audio Message */}
      {post.metadata?.audioUrl && (
        <div className={styles.audioContainer}>
          <audio
            ref={audioRef}
            src={post.metadata.audioUrl}
            onEnded={() => setIsPlayingAudio(false)}
            onPause={() => setIsPlayingAudio(false)}
          />
          <button className={styles.audioPlayButton} onClick={toggleAudio}>
            {isPlayingAudio ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className={styles.audioProgress}>
            <div className={styles.audioProgressTrack}>
              <div className={styles.audioProgressFill} style={{ width: isPlayingAudio ? '50%' : '0%' }} />
            </div>
          </div>
          <span className={styles.audioDuration}>
            {post.metadata.durationMs ? formatTime(post.metadata.durationMs / 1000) : '0:00'}
          </span>
          <Mic size={14} className={styles.audioIcon} />
        </div>
      )}

      {/* Media */}
      {post.media.length > 0 && (
        <PostMedia media={post.media} onImageClick={(index) => { setPreviewIndex(index); setImagePreviewOpen(true); }} />
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className={styles.tagsRow}>
          {post.tags.map((tag, index) => (
            <span key={index} className={styles.tag}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <PostActions
        postId={post.id}
        stats={post.stats}
        viewer={post.viewer}
        onLike={onLike}
        onComment={onComment}
        onShare={() => setShareSheetOpen(true)}
      />

      {/* Dropdown Menu */}
      {actionMenuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }}
            onClick={() => setActionMenuOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 'auto',
              right: '16px',
              zIndex: 9999,
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              border: '1px solid #e5e7eb',
              minWidth: 200,
              padding: '6px',
              marginTop: '8px',
            }}
          >
            {!isOwnPost && (
              <>
                <button
                  onClick={() => { setActionMenuOpen(false); setBlockSheetOpen(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }}
                >
                  🚫 Block Author
                </button>
                <button
                  onClick={() => { setActionMenuOpen(false); setReportSheetOpen(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }}
                >
                  🚩 Report Post
                </button>
              </>
            )}
          </div>
        </>
      )}

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

      <ShareSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        postUrl={window.location.origin + '/post/' + post.id}
      />

      <ImagePreviewModal
        open={imagePreviewOpen}
        images={mediaUrls}
        currentIndex={previewIndex}
        onClose={() => setImagePreviewOpen(false)}
        onNext={() => setPreviewIndex((prev) => Math.min(prev + 1, mediaUrls.length - 1))}
        onPrev={() => setPreviewIndex((prev) => Math.max(prev - 1, 0))}
      />
    </article>
  );
};
