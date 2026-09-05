import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { discoverService } from '../../features/discover/services/discover.service';
import { DiscoverCandidate } from '../../features/discover/types/discover.types';
import { ArrowLeft, BadgeCheck, MapPin, Heart, X, MessageCircle, Star, MoreVertical, Play, Pause } from 'lucide-react';
import styles from './DiscoverPage.module.css';

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [candidates, setCandidates] = useState<DiscoverCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMatched, setShowMatched] = useState(false);
  const [matchedName, setMatchedName] = useState('');
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadCandidates();
  }, [user]);

  const loadCandidates = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const result = await discoverService.getCandidates(user.id);
    setCandidates(result);
    setLoading(false);

    if (result.length === 0) {
      setError('No more profiles to discover right now. Check back later!');
    }
  };

  const handleSwipe = async (action: 'like' | 'pass' | 'super_like' | 'get_to_know') => {
    if (!user || currentIndex >= candidates.length) return;

    const candidate = candidates[currentIndex];

    if (action === 'pass') {
      await discoverService.swipe(user.id, candidate.userId, 'pass');
      nextCandidate();
      return;
    }

    const result = await discoverService.swipe(user.id, candidate.userId, action);

    if (result?.matched) {
      setMatchedName(candidate.displayName);
      setMatchedId(result.matchId);
      setShowMatched(true);
    } else {
      nextCandidate();
    }
  };

  const nextCandidate = () => {
    setCurrentIndex((prev) => prev + 1);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Finding people near you...</p>
      </div>
    );
  }

  if (error && candidates.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <Heart size={48} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No more profiles</p>
        <p className={styles.emptyText}>{error}</p>
        <button className={styles.refreshButton} onClick={loadCandidates}>
          Refresh
        </button>
      </div>
    );
  }

  if (currentIndex >= candidates.length) {
    return (
      <div className={styles.emptyContainer}>
        <Heart size={48} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>You're all caught up!</p>
        <p className={styles.emptyText}>Check back later for new people to discover.</p>
        <button className={styles.refreshButton} onClick={loadCandidates}>
          Refresh
        </button>
      </div>
    );
  }

  const current = candidates[currentIndex];

  return (
    <div className={styles.discoverPage}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate('/community')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Discover</h1>
        <button className={styles.headerButton} aria-label="Filters">
          <MoreVertical size={22} />
        </button>
      </header>

      {/* Video Card */}
      <div className={styles.videoCard}>
        <video
          ref={videoRef}
          src={current.videoUrl}
          poster={current.thumbnailUrl || undefined}
          loop
          muted
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className={styles.video}
          onClick={togglePlay}
        />

        {/* Play/Pause indicator */}
        {!isPlaying && (
          <button className={styles.playOverlay} onClick={togglePlay} aria-label="Play video">
            <Play size={48} />
          </button>
        )}

        {/* Profile Info Overlay */}
        <div className={styles.profileOverlay}>
          <div className={styles.profileNameRow}>
            <span className={styles.profileName}>
              {current.displayName}
              {current.age ? `, ${current.age}` : ''}
            </span>
            {current.isVerified && <BadgeCheck size={18} className={styles.verifiedIcon} />}
          </div>

          {current.city && (
            <div className={styles.profileLocation}>
              <MapPin size={12} />
              <span>{[current.city, current.state].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {current.relationshipIntent && (
            <div className={styles.profileLookingFor}>
              <Heart size={12} />
              <span>{current.relationshipIntent.replace(/_/g, ' ')}</span>
            </div>
          )}

          {current.bio && (
            <p className={styles.profileBio}>{current.bio}</p>
          )}

          {current.interests.length > 0 && (
            <div className={styles.profileInterests}>
              {current.interests.slice(0, 3).map((interest, index) => (
                <span key={index} className={styles.interestTag}>{interest}</span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            className={`${styles.actionButton} ${styles.passButton}`}
            onClick={() => handleSwipe('pass')}
            aria-label="Pass"
          >
            <X size={24} />
          </button>
          <button
            className={`${styles.actionButton} ${styles.getToKnowButton}`}
            onClick={() => handleSwipe('get_to_know')}
            aria-label="Get to Know"
          >
            <MessageCircle size={22} />
          </button>
          <button
            className={`${styles.actionButton} ${styles.likeButton}`}
            onClick={() => handleSwipe('like')}
            aria-label="Like"
          >
            <Heart size={24} />
          </button>
          <button
            className={`${styles.actionButton} ${styles.superLikeButton}`}
            onClick={() => handleSwipe('super_like')}
            aria-label="Super Like"
          >
            <Star size={22} />
          </button>
        </div>
      </div>

      {/* Match Success */}
      {showMatched && (
        <div className={styles.matchOverlay} onClick={() => setShowMatched(false)}>
          <div className={styles.matchDialog} onClick={(e) => e.stopPropagation()}>
            <Heart size={48} className={styles.matchHeart} />
            <h2 className={styles.matchTitle}>It's a Match!</h2>
            <p className={styles.matchText}>You and {matchedName} liked each other.</p>
            <button
              className={styles.startChatButton}
              onClick={() => {
                setShowMatched(false);
                navigate(`/chats/${matchedId || ''}`);
              }}
            >
              Start Chat
            </button>
            <button className={styles.keepBrowsingButton} onClick={() => { setShowMatched(false); nextCandidate(); }}>
              Keep Browsing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
