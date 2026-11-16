import { useEffect, useRef, useState } from 'react';
import { Play, MoreHorizontal, Share2, EyeOff, BadgeCheck, MapPin, Heart, MessageCircle } from 'lucide-react';
import type { DiscoverCandidate } from '../../discover/types/discover.types';
import styles from '../styles/ReelCard.module.css';

interface ReelCardProps {
  video: DiscoverCandidate;
  onOpen: (videoId: string) => void;
  onNotInterested: (videoId: string) => void;
  onShare: (video: DiscoverCandidate) => void;
  onSeen?: (videoId: string) => void;
}


export function ReelCard({ video, onOpen, onNotInterested, onShare, onSeen }: ReelCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = videoRef.current;
          if (!v) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          } else {
            v.pause();
            v.currentTime = 0;
            setIsPlaying(false);
          }
        });
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(card);
    return () => {
      observer.disconnect();
    };
  }, [video.videoId]);

  const handleCardClick = () => onOpen(video.videoId);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu((v) => !v);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onShare(video);
  };

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onNotInterested(video.videoId);
  };

  return (
    <div ref={cardRef} className={styles.card} onClick={handleCardClick} role="button" tabIndex={0}>
      <div className={styles.media}>
        {video.thumbnailUrl && !isPlaying && (
          <img src={video.thumbnailUrl} alt={video.bio || 'Video'} className={styles.thumbnail} loading="lazy" />
        )}
        <video
          ref={videoRef}
          src={video.videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className={`${styles.video} ${isPlaying ? styles.videoVisible : ''}`}
        />
        {!isPlaying && (
          <div className={styles.playIcon}>
            <Play size={20} fill="currentColor" />
          </div>
        )}

        <button type="button" className={styles.moreButton} onClick={handleMenuToggle} aria-label="More options">
          <MoreHorizontal size={16} />
        </button>

        {showMenu && (
          <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.dropdownItem} onClick={handleShare}>
              <Share2 size={14} /> Share
            </button>
            <button type="button" className={styles.dropdownItemDanger} onClick={handleNotInterested}>
              <EyeOff size={14} /> Not interested
            </button>
          </div>
        )}

        <div className={styles.statsOverlay}>
          <span className={styles.stat}>
            <Heart size={12} fill="currentColor" /> {video.likeCount || 0}
          </span>
          <span className={styles.stat}>
            <MessageCircle size={12} /> {video.commentCount || 0}
          </span>
        </div>
      </div>

      {video.bio && (
        <p className={styles.title}>{video.bio}</p>
      )}

      <div className={styles.footer}>
        <div className={styles.author}>
          {video.avatarUrl && (
            <img src={video.avatarUrl} alt={video.displayName} className={styles.avatar} />
          )}
          <span className={styles.authorName}>
            {video.displayName}
            {video.isVerified && <BadgeCheck size={12} className={styles.verified} />}
          </span>
        </div>
        {video.locationText && (
          <span className={styles.location}>
            <MapPin size={10} />
            {video.locationText}
          </span>
        )}
      </div>
    </div>
  );
}

