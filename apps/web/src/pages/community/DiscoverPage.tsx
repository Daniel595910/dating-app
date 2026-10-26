import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { discoverService } from '../../features/discover/services/discover.service';
import { mediaService } from '../../features/community/services/media.service';
import { DiscoverCandidate } from '../../features/discover/types/discover.types';
import { PublishDetails } from '../../features/discover/types/discover.types';
import { PostDetailsModal } from '../../features/discover/components/PostDetailsModal';
import { DiscoverCommentsSheet } from '../../features/discover/components/DiscoverCommentsSheet';
import { 
  BadgeCheck, MapPin, Heart, X, Play, Pause, Video, Upload, 
  Loader, ArrowLeft, Grid3x3, Plus, Clock, CheckCircle2, XCircle,
  Trash2, Eye, EyeOff, Volume2, VolumeX, RotateCcw, Check,
  MessageCircle, Share2
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
  const [isMuted, setIsMuted] = useState(true);
  const [swipe, setSwipe] = useState<SwipeState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
  });
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<{ file: File; previewUrl: string } | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [showMyVideos, setShowMyVideos] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<any>(null);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'new' | 'popular' | 'nearby'>('new');
  const [swipeCount, setSwipeCount] = useState(0);
  const [dailyLimit] = useState(50);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
      const [lastTapTime, setLastTapTime] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const swipeStateRef = useRef(swipe);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    swipeStateRef.current = swipe;
  }, [swipe]);



  useEffect(() => {
    loadCandidates();
    loadMyVideos();
    const savedCount = localStorage.getItem('discoverSwipeCount');
    if (savedCount) setSwipeCount(parseInt(savedCount));
  }, [activeCategory]);

  useEffect(() => {
    if (videoRef.current && currentIndex < candidates.length) {
      videoRef.current.muted = false;
      
      // Track view
      const currentVideo = candidates[currentIndex];
      if (currentVideo) {
        supabase.rpc('track_video_view', { p_video_id: currentVideo.videoId }).then(() => {}).catch(() => {});
      }
      
      videoRef.current.play().catch(() => {
        videoRef.current.muted = true;
        setIsMuted(true);
        videoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      });
    }
  }, [currentIndex, candidates]);





  const loadCandidates = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const result = await discoverService.getCandidates(10, activeCategory);
    if (result.length > 0) {
      const ids = await discoverService.getLikedVideoIds(result.map((c) => c.videoId));
      setLikedIds(ids);
      const counts: Record<string, number> = {};
      result.forEach((c) => { counts[c.videoId] = c.likeCount || 0; });
      setLikeCounts(counts);
    } else {
      setLikedIds(new Set());
      setLikeCounts({});
    }
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

  const handleSwipeAction = async (action: string) => {
    if (!user || currentIndex >= candidates.length) return;
    
    // Check daily limit
    if (swipeCount >= dailyLimit && action !== 'pass') {
      setError(`You've reached your daily limit of ${dailyLimit} swipes. Upgrade to VIP for unlimited swipes!`);
      return;
    }

    const candidate = candidates[currentIndex];
    const currentUserId = candidate.userId;
    await discoverService.swipe(candidate.userId, action as any);
    
    // Update swipe count
    const newCount = swipeCount + 1;
    setSwipeCount(newCount);
    localStorage.setItem('discoverSwipeCount', newCount.toString());
    
    skipToNextPerson(currentUserId);
  };

  const handleLikeButtonTap = async (videoId: string, currentlyLiked: boolean) => {
    // Optimistic heart toggle (visual feedback immediate)
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (currentlyLiked) next.delete(videoId);
      else next.add(videoId);
      return next;
    });

    // Pop animation on like only
    if (!currentlyLiked) {
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 700);
    }

    // Persist to DB
    const ok = currentlyLiked
      ? await discoverService.unlikeVideo(videoId)
      : await discoverService.likeVideo(videoId);

    if (!ok) {
      // Rollback heart on failure
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (currentlyLiked) next.add(videoId);
        else next.delete(videoId);
        return next;
      });
      return;
    }

    // Refetch authoritative like_count from DB (trigger already updated it)
    const { data } = await supabase
      .from('discover_videos')
      .select('like_count')
      .eq('id', videoId)
      .maybeSingle();

    if (data) {
      setLikeCounts((prev) => ({ ...prev, [videoId]: data.like_count || 0 }));
    }
  };

  const handleDoubleTapLike = (e: React.MouseEvent) => {
    // Ignore if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    const now = Date.now();
    if (now - lastTapTime < 300) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 800);
      handleSwipeAction('like');
      setLastTapTime(0);
    } else {
      setLastTapTime(now);
    }
  };



  const skipToNextPerson = useCallback((currentUserId: string) => {
    // Simple next - let users see multiple videos from same person
    setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
    setIsPlaying(false);
    setVideoProgress(0);
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, [candidates]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setSwipe({ isDragging: true, startX: touch.clientX, startY: touch.clientY, currentX: touch.clientX, currentY: touch.clientY, deltaX: 0, deltaY: 0 });
  }, [activeCategory]);

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
  }, [activeCategory]);

  const handleTouchEnd = useCallback(() => {
    const state = swipeStateRef.current;
    if (!state.isDragging) return;
    const threshold = 80;
    if (Math.abs(state.deltaX) > Math.abs(state.deltaY)) {
      if (state.deltaX < -threshold) {
        setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
        setIsPlaying(false);
        setVideoProgress(0);
      } else if (state.deltaX > threshold) {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setIsPlaying(false);
        setVideoProgress(0);
      }
    } else {
      if (state.deltaY < -threshold) {
        setCurrentIndex((prev) => Math.min(prev + 1, candidates.length));
        setIsPlaying(false);
        setVideoProgress(0);
      } else if (state.deltaY > threshold) {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setIsPlaying(false);
        setVideoProgress(0);
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
        videoRef.current.muted = false;
        videoRef.current.play().catch(() => {
          videoRef.current.muted = true;
          videoRef.current.play();
        });
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration > 0 && !isSeeking) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleRewind = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setVideoProgress(0);
    }
  };

  const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsSeeking(true);
    updateSeekPosition(e);
  };

  const handleSeekMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isSeeking) {
      updateSeekPosition(e);
    }
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  const updateSeekPosition = (e: React.MouseEvent | React.TouchEvent) => {
    if (videoRef.current && videoDuration > 0 && progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      let clientX: number;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
      } else if ('clientX' in e) {
        clientX = e.clientX;
      } else {
        return;
      }
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      if (videoRef.current && isFinite(videoDuration) && videoDuration > 0) {
        videoRef.current.currentTime = (percentage / 100) * videoDuration;
        setVideoProgress(percentage);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + secs.toString().padStart(2, '0');
  };

  const handlePreviewPlayPause = () => {
    if (previewVideoRef.current) {
      if (previewVideoRef.current.paused) {
        previewVideoRef.current.play();
        setPreviewPlaying(true);
      } else {
        previewVideoRef.current.pause();
        setPreviewPlaying(false);
      }
    }
  };

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const file = files[0]!;
    setPendingVideo({ file, previewUrl: URL.createObjectURL(file) });
    setShowPublishModal(true);
    setError(null);
    setUploadError(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handlePublish = async (details: PublishDetails) => {
    if (!pendingVideo || !user) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await mediaService.uploadVideo(pendingVideo.file, user.id, 'discover_video');
      if (!result.success || !result.media) {
        setUploadError(result.error || 'Failed to upload video');
        setUploading(false);
        return;
      }
      const submitted = await discoverService.submitVideo(
        result.media.url,
        details.caption,
        result.media.thumbnailUrl || null,
        details,
      );
      if (submitted) {
        URL.revokeObjectURL(pendingVideo.previewUrl);
        setPendingVideo(null);
        setShowPublishModal(false);
        await loadMyVideos();
        setError('Video submitted for review!');
      } else {
        setUploadError('Failed to submit video.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Video upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return;
    const { error } = await supabase.from('discover_videos').delete().eq('id', videoId).eq('user_id', user.id);
    if (!error) await loadMyVideos();
  };

  const handleToggleVideo = async (videoId: string, currentStatus: string) => {
    if (!user) return;
    const newStatus = currentStatus === 'removed' ? 'pending' : 'removed';
    const { error } = await supabase.from('discover_videos').update({ status: newStatus }).eq('id', videoId).eq('user_id', user.id);
    if (!error) await loadMyVideos();
  };



  const formatCount = (n: number): string => {
    if (n < 1000) return n.toString();
    if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
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
  const swipesRemaining = dailyLimit - swipeCount;



  return (
    <div ref={containerRef} className={styles.discoverPage} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', overscrollBehavior: 'none' }}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.headerTitle}>Discover</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.headerButton} onClick={(e) => { e.stopPropagation(); setShowMyVideos(true); }} aria-label="My Videos">
            <Grid3x3 size={20} />
          </button>
          <button className={styles.headerButton} onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }} aria-label="Upload">
            <Upload size={20} />
          </button>
        </div>
      </header>

      {/* Swipe Counter */}
      <div className={styles.swipeCounter}>
        <span>{swipeCount}/{dailyLimit} swipes</span>
        <span className={styles.swipeRemaining}>{swipesRemaining} remaining</span>
      </div>

      {/* Category Tabs */}
      <div className={styles.categoryTabs}>
        <button className={`${styles.categoryTab} ${activeCategory === 'new' ? styles.categoryTabActive : ''}`} onClick={() => setActiveCategory('new')}>New</button>
        <button className={`${styles.categoryTab} ${activeCategory === 'popular' ? styles.categoryTabActive : ''}`} onClick={() => setActiveCategory('popular')}>Popular</button>
        <button className={`${styles.categoryTab} ${activeCategory === 'nearby' ? styles.categoryTabActive : ''}`} onClick={() => setActiveCategory('nearby')}>Nearby</button>
      </div>

      {/* Double-tap Like Animation */}
      {showLikeAnimation && (
        <div className={styles.likeAnimation}>
          <Heart size={80} fill="#ef4444" />
        </div>
      )}

      {showMyVideos && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex' }} onClick={() => setShowMyVideos(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#fff', width: '100%', maxWidth: 480, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setShowMyVideos(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <ArrowLeft size={24} />
                </button>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>My Videos</h2>
              </div>
              <button onClick={() => { setShowMyVideos(false); videoInputRef.current?.click(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                <Plus size={24} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
              {myVideos.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 24, textAlign: 'center' }}>
                  <Video size={48} style={{ color: '#d1d5db' }} />
                  <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>No videos yet</p>
                  <button onClick={() => { setShowMyVideos(false); videoInputRef.current?.click(); }} style={{ padding: '12px 24px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer' }}>Upload Video</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {myVideos.map((video) => (
                    <div key={video.video_id} style={{ position: 'relative', aspectRatio: '9/16', backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }} onClick={() => { setPreviewVideo(video); setPreviewPlaying(true); }}>
                      <video src={video.video_url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: 8, left: 8 }}>
                        {video.status === 'approved' && <span style={{ backgroundColor: '#10b981', color: '#fff', padding: '4px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700 }}>Approved</span>}
                        {video.status === 'pending' && <span style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '4px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700 }}>Pending</span>}
                        {video.status === 'removed' && <span style={{ backgroundColor: '#6b7280', color: '#fff', padding: '4px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 700 }}>Hidden</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewVideo && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex' }} onClick={() => setPreviewVideo(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <video 
              ref={previewVideoRef}
              src={previewVideo.video_url} 
              autoPlay 
              playsInline 
              loop
              muted
              onPlay={() => setPreviewPlaying(true)}
              onPause={() => setPreviewPlaying(false)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <button 
              onClick={handlePreviewPlayPause}
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 5 }}
              aria-label="Play/Pause"
            >
              {previewPlaying ? <Pause size={28} /> : <Play size={28} />}
            </button>
            <button onClick={() => setPreviewVideo(null)} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', zIndex: 10 }}>
              <ArrowLeft size={24} />
            </button>
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => { handleToggleVideo(previewVideo.video_id, previewVideo.status); setPreviewVideo(null); }} style={{ padding: '12px 20px', backgroundColor: previewVideo.status === 'removed' ? '#10b981' : '#6b7280', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {previewVideo.status === 'removed' ? 'Show' : 'Hide'}
              </button>
              <button onClick={() => { handleDeleteVideo(previewVideo.video_id); setPreviewVideo(null); }} style={{ padding: '12px 20px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingVideo && (
        <PostDetailsModal
          open={showPublishModal}
          videoUrl={pendingVideo.previewUrl}
          onClose={() => { if (!uploading) { URL.revokeObjectURL(pendingVideo.previewUrl); setPendingVideo(null); setShowPublishModal(false); } }}
          onPublish={handlePublish}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      )}

      {current && (
        <div className={styles.videoCard} style={{ transform: 'translateX(' + swipe.deltaX + 'px) translateY(' + swipe.deltaY + 'px)', transition: swipe.isDragging ? 'none' : 'transform 0.3s ease' }} onClick={handleDoubleTapLike}>
          <video ref={videoRef} src={current.videoUrl} loop playsInline autoPlay preload="auto" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} className={styles.video} onClick={togglePlay} />
          {showHeartPop && <Heart size={120} className={styles.heartPop} fill="#f97316" />}
          {!isPlaying && <button className={styles.playOverlay} onClick={togglePlay}><Play size={48} /></button>}
          


          <button onClick={toggleMute} style={{ position: 'absolute', top: 80, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: '#fff', zIndex: 15 }}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button onClick={handleRewind} style={{ position: 'absolute', top: 130, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: '#fff', zIndex: 15 }}>
            <RotateCcw size={18} />
          </button>
          <div className={styles.infoOverlay}>
            <div className={styles.infoNameRow}>
              <span className={styles.infoName}>
                {current.displayName}{current.age ? ', ' + current.age : ''}
              </span>
              {current.isVerified && <BadgeCheck size={16} style={{ color: '#3b82f6' }} />}
            </div>
            {current.bio && <p className={styles.infoCaption}>{current.bio}</p>}
            {current.hashtags && current.hashtags.length > 0 && (
              <div className={styles.infoHashtags}>
                {current.hashtags.map((tag) => (
                  <span key={tag} className={styles.infoHashtag}>#{tag}</span>
                ))}
              </div>
            )}
            {(current.locationText || current.city) && (
              <div className={styles.infoLocation}>
                <MapPin size={11} />
                <span>{current.locationText || [current.city, current.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          <div 
            ref={progressBarRef}
            style={{ position: 'absolute', bottom: 65, left: 0, right: 0, padding: '0 16px', zIndex: 20, cursor: 'pointer' }}
            onMouseDown={handleSeekStart}
            onMouseMove={handleSeekMove}
            onMouseUp={handleSeekEnd}
            onMouseLeave={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchMove={handleSeekMove}
            onTouchEnd={handleSeekEnd}
          >
            <div style={{ width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 9999, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: videoProgress + '%', height: '100%', backgroundColor: '#ef4444', borderRadius: 9999, transition: isSeeking ? 'none' : 'width 0.1s linear' }} />
              <div style={{ position: 'absolute', left: videoProgress + '%', top: '50%', transform: 'translate(-50%, -50%)', width: 14, height: 14, backgroundColor: '#ffffff', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
              <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
              <span>{formatTime(videoDuration)}</span>
            </div>
          </div>

          <div className={styles.rightActions}>
            <button
              className={styles.rightAvatarButton}
              onClick={(e) => { e.stopPropagation(); navigate('/profile/' + current.userId); }}
              aria-label={'View ' + current.displayName + ' profile'}
            >
              {current.avatarUrl
                ? <img src={current.avatarUrl} alt={current.displayName} />
                : <span>{current.displayName.charAt(0)}</span>}
            </button>
            <button
              className={styles.rightActionButton + (likedIds.has(current.videoId) ? ' ' + styles.liked : '')}
              onClick={(e) => {
                e.stopPropagation();
                const now = Date.now();
                if (now - lastTapTime < 300) {
                  setLastTapTime(0);
                  handleSwipeAction('like');
                } else {
                  setLastTapTime(now);
                  handleLikeButtonTap(current.videoId, likedIds.has(current.videoId));
                }
              }}
              aria-label={likedIds.has(current.videoId) ? 'Unlike' : 'Like'}
            >
              <Heart size={22} fill={likedIds.has(current.videoId) ? '#f97316' : 'none'} />
            </button>
            <div className={styles.likeCount}>
              {formatCount(likeCounts[current.videoId] || 0)}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setCommentsVideoId(current.videoId); setCommentsOpen(true); }}
              className={styles.rightActionButton}
              aria-label="Comment"
            >
              <MessageCircle size={22} />
            </button>
            <div className={styles.likeCount}>
              {formatCount(commentCounts[current.videoId] !== undefined ? commentCounts[current.videoId] : (current.commentCount || 0))}
            </div>
            <button
              className={styles.rightActionButton}
              onClick={(e) => {
                e.stopPropagation();
                const shareUrl = window.location.origin + '/profile/' + current.userId;
                if (navigator.share) {
                  navigator.share({ title: current.displayName, url: shareUrl }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(shareUrl).catch(() => {});
                }
              }}
              aria-label="Share"
            >
              <Share2 size={22} />
            </button>
          </div>
        </div>
      )}

      <DiscoverCommentsSheet
        open={commentsOpen}
        videoId={commentsVideoId}
        currentUserId={user?.id || null}
        onClose={() => { setCommentsOpen(false); setCommentsVideoId(null); }}
        onCommentAdded={() => {
          const vId = commentsVideoId;
          if (!vId) return;
          supabase
            .from('discover_videos')
            .select('comment_count')
            .eq('id', vId)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                setCommentCounts((prev) => ({ ...prev, [vId]: data.comment_count || 0 }));
              }
            });
        }}
        onCommentDeleted={() => {
          const vId = commentsVideoId;
          if (!vId) return;
          supabase
            .from('discover_videos')
            .select('comment_count')
            .eq('id', vId)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                setCommentCounts((prev) => ({ ...prev, [vId]: data.comment_count || 0 }));
              }
            });
        }}
      />

      {uploadError && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setUploadError(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: 24, padding: '32px 24px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <XCircle size={32} style={{ color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#111827' }}>Video Upload Failed</h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>{uploadError}</p>
            <button onClick={() => setUploadError(null)} style={{ width: '100%', padding: 14, backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
              Got it
            </button>
          </div>
        </div>
      )}

      {!current && !loading && (
        <div className={styles.emptyContainer}>
          <Heart size={48} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No profiles yet</p>
          <p className={styles.emptyText}>{error || 'Upload your video to start discovering!'}</p>
          <button className={styles.refreshButton} onClick={() => videoInputRef.current?.click()}>Upload Your Video</button>
        </div>
      )}
      <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleVideoUpload(e.target.files)} style={{ display: 'none' }} />
    </div>
  );
};
























