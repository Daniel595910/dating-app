import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { discoverService } from '../../features/discover/services/discover.service';
import { mediaService } from '../../features/community/services/media.service';
import { DiscoverCandidate } from '../../features/discover/types/discover.types';
import { 
  BadgeCheck, MapPin, Heart, X, MessageCircle, 
  MoreVertical, Play, Pause, Video, Upload, Loader
} from 'lucide-react';
import styles from './DiscoverPage.module.css';

interface SwipeState {
  isDragging: boolean;
  startY: number;
  currentY: number;
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
    startY: 0,
    currentY: 0,
    deltaY: 0,
  });
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [showMyVideos, setShowMyVideos] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
    
    if (nextVideoRef.current && currentIndex + 1 < candidates.length) {
      nextVideoRef.current.src = candidates[currentIndex + 1].videoUrl;
      nextVideoRef.current.load();
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

    if (action === 'pass') {
      await discoverService.swipe(candidate.userId, 'pass');
      nextCandidate();
      return;
    }

    const result = await discoverService.swipe(candidate.userId, action);

    if (result?.matched) {
      setMatchedName(candidate.displayName);
      setMatchedId(result.matchId);
      setShowMatched(true);
    } else {
      nextCandidate();
    }
  };

  const nextCandidate = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
    setIsPlaying(false);
    setSwipe({ isDragging: false, startY: 0, currentY: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, [candidates.length]);

  const previousCandidate = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setIsPlaying(false);
    setSwipe({ isDragging: false, startY: 0, currentY: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setSwipe({
      isDragging: true,
      startY: e.clientY,
      currentY: e.clientY,
      deltaY: 0,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipe.isDragging) return;
    
    const deltaY = e.clientY - swipe.startY;
    setSwipe((prev) => ({
      ...prev,
      currentY: e.clientY,
      deltaY,
    }));
    
    if (Math.abs(deltaY) > 10) {
      setSwipeDirection(deltaY > 0 ? 'down' : 'up');
    }
  };

  const handlePointerUp = () => {
    if (!swipe.isDragging) return;
    
    const threshold = 100;
    
    if (swipe.deltaY < -threshold) {
      if (currentIndex < candidates.length - 1) {
        nextCandidate();
      }
    } else if (swipe.deltaY > threshold) {
      if (currentIndex > 0) {
        previousCandidate();
      }
    }
    
    setSwipe({ isDragging: false, startY: 0, currentY: 0, deltaY: 0 });
    setSwipeDirection(null);
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

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await mediaService.uploadVideo(files[0]!, user.id, 'discover_video');
      
      if (result.success && result.media) {
        // Submit to discover
        const submitted = await discoverService.submitVideo(
          result.media.url,
          'Check out my video!',
          result.media.thumbnailUrl || null
        );

        if (submitted) {
          setShowUpload(false);
          await loadMyVideos();
          // Show success message
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
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Discover</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={styles.headerButton} 
            onClick={() => setShowMyVideos(!showMyVideos)}
            aria-label="My Videos"
          >
            <Video size={22} />
          </button>
          <button 
            className={styles.headerButton} 
            onClick={() => setShowUpload(true)}
            aria-label="Upload Video"
          >
            <Upload size={22} />
          </button>
        </div>
      </header>

      {/* Upload Video Modal */}
      {showUpload && (
        <div className={styles.uploadOverlay} onClick={() => !uploading && setShowUpload(false)}>
          <div className={styles.uploadDialog} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.uploadTitle}>Upload Your Video</h2>
            <p className={styles.uploadText}>
              Share a video introducing yourself. Your video will be reviewed before appearing in Discover.
            </p>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => handleVideoUpload(e.target.files)}
              style={{ display: 'none' }}
            />
            <button
              className={styles.uploadButton}
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader size={20} className={styles.spinning} />
                  Uploading... {Math.round(uploadProgress)}%
                </>
              ) : (
                <>
                  <Video size={20} />
                  Choose Video
                </>
              )}
            </button>
            <button
              className={styles.cancelButton}
              onClick={() => !uploading && setShowUpload(false)}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* My Videos Panel */}
      {showMyVideos && (
        <div className={styles.myVideosOverlay} onClick={() => setShowMyVideos(false)}>
          <div className={styles.myVideosDialog} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.uploadTitle}>My Discover Videos</h2>
            {myVideos.length === 0 ? (
              <p className={styles.uploadText}>You haven't uploaded any videos yet.</p>
            ) : (
              <div className={styles.myVideosList}>
                {myVideos.map((video) => (
                  <div key={video.video_id} className={styles.myVideoItem}>
                    <video
                      src={video.video_url}
                      controls
                      className={styles.myVideoPreview}
                    />
                    <div className={styles.myVideoInfo}>
                      <span className={styles.myVideoStatus}>
                        Status: {video.status}
                      </span>
                      <span className={styles.myVideoDate}>
                        {new Date(video.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              className={styles.cancelButton}
              onClick={() => setShowMyVideos(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Current Video Card */}
      {current && (
        <div 
          className={styles.videoCard}
          style={{
            transform: `translateY(${swipe.deltaY}px)`,
            transition: swipe.isDragging ? 'none' : 'transform 0.3s ease',
            opacity: swipe.isDragging ? Math.max(0.5, 1 - Math.abs(swipe.deltaY) / 400) : 1,
          }}
        >
          <video
            ref={videoRef}
            src={current.videoUrl}
            poster={current.thumbnailUrl || undefined}
            loop
            muted
            playsInline
            autoPlay
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
              className={`${styles.actionButton} ${styles.getToKnowButton}`}
              onClick={() => handleSwipeAction('get_to_know')}
              aria-label="Get to Know"
            >
              <MessageCircle size={22} />
            </button>
            <button
              className={`${styles.actionButton} ${styles.likeButton}`}
              onClick={() => handleSwipeAction('like')}
              aria-label="Like"
            >
              <Heart size={24} />
            </button>
          </div>

          {swipeDirection && Math.abs(swipe.deltaY) > 20 && (
            <div 
              className={`${styles.swipeIndicator} ${swipeDirection === 'up' ? styles.swipeUp : styles.swipeDown}`}
            >
              {swipeDirection === 'up' ? <span>Next profile</span> : <span>Previous profile</span>}
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

      {/* Match Success */}
      {showMatched && (
        <div className={styles.matchOverlay} onClick={() => setShowMatched(false)}>
          <div className={styles.matchDialog} onClick={(e) => e.stopPropagation()}>
            <Heart size={48} className={styles.matchHeart} />
            <h2 className={styles.matchTitle}>It's a Match!</h2>
            <p className={styles.matchText}>You and {matchedName} liked each other.</p>
            <button
              className={styles.startChatButton}
              onClick={async () => {
                if (matchedId) {
                  const { data: convId, error } = await supabase.rpc('get_or_create_conversation', {
                    p_match_id: matchedId
                  });
                  if (!error && convId) {
                    setShowMatched(false);
                    navigate(`/chats/${convId}`);
                  }
                }
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
