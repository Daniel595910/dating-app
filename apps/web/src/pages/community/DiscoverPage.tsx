import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { discoverService } from '../../features/discover/services/discover.service';
import { mediaService } from '../../features/community/services/media.service';
import { DiscoverCandidate } from '../../features/discover/types/discover.types';
import { 
  BadgeCheck, MapPin, Heart, X, User, 
  Play, Pause, Video, Upload, Loader, XCircle
} from 'lucide-react';
import styles from './DiscoverPage.module.css';

interface SwipeState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
}

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
  const [swipe, setSwipe] = useState<SwipeState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
  });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [showMyVideos, setShowMyVideos] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const swipeStateRef = useRef(swipe);

  useEffect(() => {
    swipeStateRef.current = swipe;
  }, [swipe]);

  useEffect(() => {
    loadCandidates();
    loadMyVideos();
  }, []);

  useEffect(() => {
    if (videoRef.current && currentIndex < candidates.length) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentIndex, candidates]);

  const loadCandidates = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const result = await discoverService.getCandidates();
    setCandidates(result);
    setLoading(false);

    if (result.length === 0) {
      setError('No more profiles to discover right now. Check back later!');
    }
  };

  const loadMyVideos = async () => {
    if (!user) return;
    const videos = await discoverService.getMyVideos();
    setMyVideos(videos);
  };

  const handleSwipeAction = async (action: 'like' | 'pass' | 'get_to_know') => {
    if (!user || currentIndex >= candidates.length) return;

    const candidate = candidates[currentIndex];
    const currentUserId = candidate.userId;

    if (action === 'pass') {
      await discoverService.swipe(candidate.userId, 'pass');
      skipToNextPerson(currentUserId);
      return;
    }

    const result = await discoverService.swipe(candidate.userId, action);

    if (result?.matched) {
      setMatchedName(candidate.displayName);
      setMatchedId(result.matchId);
      setShowMatched(true);
    } else {
      skipToNextPerson(currentUserId);
    }
  };

  const skipToNextPerson = useCallback((currentUserId: string) => {
    setCurrentIndex((prev) => {
      let next = prev + 1;
      // Skip all videos of the same user
      while (next < candidates.length && candidates[next].userId === currentUserId) {
        next++;
      }
      return Math.min(next, candidates.length);
    });
    setIsPlaying(false);
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, [candidates]);

  const nextCandidate = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
    setIsPlaying(false);
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, [candidates.length]);

  const previousCandidate = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setIsPlaying(false);
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    
    setSwipe({
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
    });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const state = swipeStateRef.current;
    if (!state.isDragging) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    
    setSwipe((prev) => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
    }));
    
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setSwipeDirection(deltaX > 0 ? 'right' : 'left');
      } else {
        setSwipeDirection(deltaY > 0 ? 'down' : 'up');
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const state = swipeStateRef.current;
    if (!state.isDragging) return;
    
    const threshold = 80;
    
    if (Math.abs(state.deltaX) > Math.abs(state.deltaY)) {
      // Horizontal - switch profile
      if (state.deltaX < -threshold) {
        setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
        setIsPlaying(false);
      } else if (state.deltaX > threshold) {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setIsPlaying(false);
      }
    } else {
      // Vertical - also switch profile for now
      if (state.deltaY < -threshold) {
        // Swipe up - next
        setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
        setIsPlaying(false);
      } else if (state.deltaY > threshold) {
        // Swipe down - previous
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setIsPlaying(false);
      }
    }
    
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, [candidates.length]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setSwipe({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      deltaX: 0,
      deltaY: 0,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const state = swipeStateRef.current;
    if (!state.isDragging) return;
    
    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;
    
    setSwipe((prev) => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
      deltaX,
      deltaY,
    }));
    
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setSwipeDirection(deltaX > 0 ? 'right' : 'left');
      } else {
        setSwipeDirection(deltaY > 0 ? 'down' : 'up');
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    const state = swipeStateRef.current;
    if (!state.isDragging) return;
    
    const threshold = 80;
    
    if (Math.abs(state.deltaX) > Math.abs(state.deltaY)) {
      if (state.deltaX < -threshold) {
        setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
        setIsPlaying(false);
      } else if (state.deltaX > threshold) {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setIsPlaying(false);
      }
    } else {
      if (state.deltaY < -threshold) {
        setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
        setIsPlaying(false);
      } else if (state.deltaY > threshold) {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setIsPlaying(false);
      }
    }
    
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, [candidates.length]);

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

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await mediaService.uploadVideo(files[0]!, user.id, 'discover_video');
      
      if (result.success && result.media) {
        const submitted = await discoverService.submitVideo(
          result.media.url,
          'Check out my video!',
          result.media.thumbnailUrl || null
        );

        if (submitted) {
          setShowUpload(false);
          await loadMyVideos();
          setError('Video submitted for review! It will appear in Discover once approved.');
        } else {
          setError('Failed to submit video. Please try again.');
        }
      } else {
        setError(result.error || 'Failed to upload video');
      }
    } catch (err: any) {
      setError(err.message || 'Video upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = '';
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

  const current = currentIndex < candidates.length ? candidates[currentIndex] : null;

  return (
    <div 
      ref={containerRef}
      className={styles.discoverPage}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Discover</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={styles.headerButton} 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowMyVideos(true);
            }}
            aria-label="My Videos"
            style={{ pointerEvents: 'auto', zIndex: 100 }}
          >
            <Video size={22} />
          </button>
          <button 
            className={styles.headerButton} 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowUpload(true);
            }}
            aria-label="Upload Video"
            style={{ pointerEvents: 'auto', zIndex: 100 }}
          >
            <Upload size={22} />
          </button>
        </div>
      </header>

      {/* My Videos Panel */}
      {showMyVideos && (
        <div 
          className={styles.myVideosOverlay} 
          onClick={() => setShowMyVideos(false)}
          style={{ zIndex: 999, position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div 
            className={styles.myVideosDialog} 
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%', margin: 'auto', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>My Discover Videos</h2>
              <button 
                onClick={() => setShowMyVideos(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
              >
                <XCircle size={24} />
              </button>
            </div>
            
            {myVideos.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
                You haven't uploaded any videos yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myVideos.map((video) => (
                  <div key={video.video_id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                    <video
                      src={video.video_url}
                      controls
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                        Status: {video.status}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {new Date(video.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Video Modal */}
      {showUpload && (
        <div 
          className={styles.uploadOverlay} 
          onClick={() => !uploading && setShowUpload(false)}
          style={{ zIndex: 999, position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div 
            className={styles.uploadDialog} 
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%', textAlign: 'center' }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Upload Your Video</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              Share a video introducing yourself. Your video will be reviewed before appearing in Discover.
            </p>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleVideoUpload(e.target.files)}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {uploading ? (
                <>
                  <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Uploading...
                </>
              ) : (
                <>
                  <Video size={20} />
                  Choose Video
                </>
              )}
            </button>
            <button
              onClick={() => !uploading && setShowUpload(false)}
              disabled={uploading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'none',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current Video Card */}
      {current && (
        <div 
          className={styles.videoCard}
          style={{
            transform: `translateX(${swipe.deltaX}px) translateY(${swipe.deltaY}px)`,
            transition: swipe.isDragging ? 'none' : 'transform 0.3s ease',
            opacity: swipe.isDragging ? Math.max(0.5, 1 - Math.abs(swipe.deltaX) / 400 - Math.abs(swipe.deltaY) / 400) : 1,
          }}
        >
          <video
            ref={videoRef}
            src={current.videoUrl}
            loop
            muted
            playsInline
            autoPlay
            preload="auto"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className={styles.video}
            onClick={togglePlay}
          />

          {!isPlaying && (
            <button className={styles.playOverlay} onClick={togglePlay} aria-label="Play video">
              <Play size={48} />
            </button>
          )}

          <div className={styles.profileOverlay}>
            <div className={styles.profileNameRow}>
              <span className={styles.profileName}>
                {current.displayName}
                {current.age ? `, ${current.age}` : ''}
              </span>
              {current.isVerified && <BadgeCheck size={18} className={styles.verifiedIcon} />}
            </div>

            {current.distanceKm && current.distanceKm > 0 && (
              <div className={styles.profileLocation}>
                <MapPin size={12} />
                <span>{Math.round(current.distanceKm)} km away</span>
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

          <div className={styles.actionButtons}>
            <button
              className={`${styles.actionButton} ${styles.passButton}`}
              onClick={() => handleSwipeAction('pass')}
              aria-label="Pass"
            >
              <X size={24} />
            </button>
            <button
              onClick={() => navigate(`/profile/${current.userId}`)}
              aria-label="View Profile"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '3px solid #ffffff',
                cursor: 'pointer',
                padding: 0,
                overflow: 'hidden',
                backgroundColor: '#f3f4f6',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {current.avatarUrl ? (
                <img 
                  src={current.avatarUrl} 
                  alt={current.displayName}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              ) : (
                <span style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#6b7280',
                }}>
                  {current.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <button
              className={`${styles.actionButton} ${styles.likeButton}`}
              onClick={() => handleSwipeAction('like')}
              aria-label="Like"
            >
              <Heart size={24} />
            </button>
          </div>

          {swipeDirection && (Math.abs(swipe.deltaX) > 20 || Math.abs(swipe.deltaY) > 20) && (
            <div 
              className={`${styles.swipeIndicator} ${
                swipeDirection === 'left' ? styles.swipeLeft : 
                swipeDirection === 'right' ? styles.swipeRight :
                swipeDirection === 'up' ? styles.swipeUp : styles.swipeDown
              }`}
            >
              {swipeDirection === 'left' && <span>Next</span>}
              {swipeDirection === 'right' && <span>Previous</span>}
              {swipeDirection === 'up' && <span>Next</span>}
              {swipeDirection === 'down' && <span>Previous</span>}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!current && !loading && (
        <div className={styles.emptyContainer}>
          <Heart size={48} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No profiles yet</p>
          <p className={styles.emptyText}>
            {error || 'Upload your video to start discovering!'}
          </p>
          <button 
            className={styles.refreshButton}
            onClick={() => setShowUpload(true)}
          >
            Upload Your Video
          </button>
        </div>
      )}
    </div>
  );
};




