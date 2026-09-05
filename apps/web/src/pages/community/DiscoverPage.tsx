import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { discoverService } from '../../features/discover/services/discover.service';
import { mediaService } from '../../features/community/services/media.service';
import { DiscoverCandidate } from '../../features/discover/types/discover.types';
import { 
  BadgeCheck, MapPin, Heart, X, Play, Pause, Video, Upload, 
  Loader, ArrowLeft, Grid3x3, Plus, Clock, CheckCircle2, XCircle
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
      while (next < candidates.length && candidates[next].userId === currentUserId) {
        next++;
      }
      return Math.min(next, candidates.length);
    });
    setIsPlaying(false);
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, [candidates]);

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
    
    setSwipe((prev) => ({ ...prev, currentX: touch.clientX, currentY: touch.clientY, deltaX, deltaY }));
    
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
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        overscrollBehavior: 'none',
      }}
    >
      {/* Header with Back Button */}
      <header className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => navigate('/community')}
          aria-label="Back to Community"
        >
          <ArrowLeft size={20} />
        </button>
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
            <Grid3x3 size={20} />
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
            <Upload size={20} />
          </button>
        </div>
      </header>

      {/* My Videos Modal - Instagram Style Grid */}
      {showMyVideos && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
          }}
          onClick={() => setShowMyVideos(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              backgroundColor: '#ffffff', 
              width: '100%',
              maxWidth: '480px',
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => setShowMyVideos(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <ArrowLeft size={24} />
                </button>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>My Videos</h2>
              </div>
              <button
                onClick={() => { setShowMyVideos(false); setShowUpload(true); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#ef4444',
                }}
              >
                <Plus size={24} />
              </button>
            </div>

            {/* Instagram-style Grid */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '4px',
            }}>
              {myVideos.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '16px',
                  padding: '24px',
                  textAlign: 'center',
                }}>
                  <Video size={48} style={{ color: '#d1d5db' }} />
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    No videos yet
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    Upload your first video to start discovering!
                  </p>
                  <button
                    onClick={() => { setShowMyVideos(false); setShowUpload(true); }}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    Upload Video
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '4px',
                }}>
                  {myVideos.map((video, index) => (
                    <div
                      key={video.video_id}
                      style={{
                        position: 'relative',
                        aspectRatio: '9/16',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <video
                        src={video.video_url}
                        muted
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />
                      {/* Status Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        {video.status === 'approved' && (
                          <span style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '4px 8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Approved
                          </span>
                        )}
                        {video.status === 'pending' && (
                          <span style={{ backgroundColor: '#f59e0b', color: '#ffffff', padding: '4px 8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Pending
                          </span>
                        )}
                        {video.status === 'rejected' && (
                          <span style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '4px 8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => !uploading && setShowUpload(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '24px', 
              padding: '32px 24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Video size={32} style={{ color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#111827' }}>
              Upload Your Video
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>
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
                padding: '14px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '16px',
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
                  Uploading... {Math.round(uploadProgress)}%
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Choose Video
                </>
              )}
            </button>
            <button
              onClick={() => !uploading && setShowUpload(false)}
              disabled={uploading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'none',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '16px',
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#6b7280' }}>
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
            <div className={`${styles.swipeIndicator} ${swipeDirection === 'left' ? styles.swipeLeft : swipeDirection === 'right' ? styles.swipeRight : swipeDirection === 'up' ? styles.swipeUp : styles.swipeDown}`}>
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
          <p className={styles.emptyText}>{error || 'Upload your video to start discovering!'}</p>
          <button className={styles.refreshButton} onClick={() => setShowUpload(true)}>
            Upload Your Video
          </button>
        </div>
      )}
    </div>
  );
};

