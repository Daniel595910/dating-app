import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, MapPin, BadgeCheck, Share2, UserPlus, Check, Play, Pause, Mic, MoreHorizontal, Flag, Ban } from 'lucide-react';
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
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioProgressRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  

  const isOwnPost = post.author.id === currentUserId;

  useEffect(() => {
    if (!currentUserId || !post.author.id || isOwnPost) return;

    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', post.author.id)
        .maybeSingle();
      
      setIsFollowing(Boolean(data));
    };

    checkFollowStatus();
  }, [currentUserId, post.author.id, isOwnPost]);
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

  const handleAudioTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration > 0) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && audioProgressRef.current && audioDuration > 0 && isFinite(audioDuration)) {
      const rect = audioProgressRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      const newTime = (percentage / 100) * audioDuration;
      if (isFinite(newTime) && newTime >= 0) {
        audioRef.current.currentTime = newTime;
        setAudioProgress(percentage);
      }
    }
  };

  const cyclePlaybackRate = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.5, 2, 0.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    audioRef.current.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + secs.toString().padStart(2, '0');
  };

  return (
    <article className={styles.card}>
      {/* Author Row */}
      <div className={styles.authorRow}>
        <button className={styles.authorClickable} onClick={() => onProfileClick(post.author.id)}>
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
                  {post.author.location}
                </span>
              )}
              <span className={styles.timeAgo}>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</span>
            </div>
          </div>
        </button>

        <div className={styles.authorActions}>
          {!isOwnPost && !isFollowing && (
            <button
              className={styles.followButton}
              onClick={handleFollow}
              disabled={followLoading}
            >
              <UserPlus size={12} />
              <span>Follow</span>
            </button>
          )}
          <button className={styles.moreButton} onClick={() => setShowMenu(!showMenu)} aria-label="More options">
            <MoreHorizontal size={18} />
          </button>
        </div>

        {showMenu && (
          <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
            <button className={styles.dropdownItem} onClick={() => { setReportSheetOpen(true); setShowMenu(false); }}>
              <Flag size={14} /> Report
            </button>
            {!isOwnPost && (
              <button className={styles.dropdownItemDanger} onClick={() => { setBlockSheetOpen(true); setShowMenu(false); }}>
                <Ban size={14} /> Block
              </button>
            )}
          </div>
        )}
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
            onTimeUpdate={handleAudioTimeUpdate}
          />
          <button className={styles.audioPlayButton} onClick={toggleAudio}>
            {isPlayingAudio ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div 
            className={styles.audioProgress} 
            ref={audioProgressRef}
            onClick={handleAudioSeek}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.audioProgressTrack}>
              <div className={styles.audioProgressFill} style={{ width: audioProgress + '%' }} />
            </div>
            <div 
              className={styles.audioProgressThumb} 
              style={{ left: audioProgress + '%' }}
            />
          </div>
          <span className={styles.audioDuration}>
            {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(audioDuration)}
          </span>
          <button className={styles.speedButton} onClick={cyclePlaybackRate}>
            {playbackRate}x
          </button>
          <Mic size={12} className={styles.audioIcon} />
        </div>
      )}

      {/* Media */}
      {post.media.length > 0 && (
        <div className={styles.mediaWrapper}>
          <PostMedia media={post.media} onImageClick={(index) => { setPreviewIndex(index); setImagePreviewOpen(true); }} />
        </div>
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
      <div className={styles.actionsDivider} />
      <PostActions
        postId={post.id}
        stats={post.stats}
        viewer={post.viewer}
        onLike={onLike}
        onComment={onComment}
        onShare={() => setShareSheetOpen(true)}
      />

      {/* Sheets */}
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






