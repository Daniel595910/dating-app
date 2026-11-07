import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { supabase } from '@/config/supabase.client';
import { discoverService } from '../../features/discover/services/discover.service';
import { mediaService } from '../../features/community/services/media.service';
import { SearchResult } from '../../features/discover/types/discover.types';
import { DiscoverCandidate } from '../../features/discover/types/discover.types';
import { PublishDetails } from '../../features/discover/types/discover.types';
import { PostDetailsModal } from '../../features/discover/components/PostDetailsModal';
import { DiscoverCommentsSheet } from '../../features/discover/components/DiscoverCommentsSheet';
import { DiscoverSearchModal } from '../../features/discover/components/DiscoverSearchModal';
import { DownloadModal } from '../../features/discover/components/DownloadModal';
import { MyVideosSheet } from '../../features/discover/components/MyVideosSheet';
import { VideoPreviewModal } from '../../features/discover/components/VideoPreviewModal';
import { useStoryRings } from '../../features/community/hooks/useStoryRings';
import { StoryViewer } from '../../features/community/components/StoryViewer';
import { BottomNav } from '../../features/community/components/BottomNav';
import { 
  WifiOff, BadgeCheck, MapPin, Heart, X, Play, Pause, Video, Upload, 
  Loader, ArrowLeft, Grid3x3, Plus, Clock, CheckCircle2, XCircle,
  Trash2, Eye, EyeOff, Check,
  MessageSquare, Send, Maximize2, TrendingUp
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
  const themeMode = useThemeStore((s) => s.theme);
  const effectiveTheme: 'light' | 'dark' = themeMode === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : themeMode;
  const [candidates, setCandidates] = useState<DiscoverCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedExhausted, setFeedExhausted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [videoIsLandscape, setVideoIsLandscape] = useState(false);
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
  const [activeCategory, setActiveCategory] = useState<'new' | 'popular'>('new');
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [dailyLimit] = useState(50);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
      const [lastTapTime, setLastTapTime] = useState(0);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);
  const [showPostedToast, setShowPostedToast] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const { ringState } = useStoryRings(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); setShowOfflineToast(false); };
    const handleOffline = () => { setIsOffline(true); setShowOfflineToast(true); setTimeout(() => setShowOfflineToast(false), 4000); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerAuthorId, setStoryViewerAuthorId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const swipeStateRef = useRef(swipe);
  const videoCardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    direction: null as 'horizontal' | 'vertical' | null,
  });
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
      videoRef.current.muted = !audioUnlocked;
      
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

  // Pause feed video when any modal is open
  useEffect(() => {
    const modalOpen = showPublishModal || showMyVideos || Boolean(previewVideo) || commentsOpen || searchModalOpen;
    const v = videoRef.current;
    if (!v) return;
    if (modalOpen && !v.paused) {
      v.pause();
      setIsPlaying(false);
    }
  }, [showPublishModal, showMyVideos, previewVideo, commentsOpen, searchModalOpen]);





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
      const sCounts: Record<string, number> = {};
      result.forEach((c) => { sCounts[c.videoId] = (c as any).shareCount || 0; });
      setShareCounts(sCounts);
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

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !user) return;
    setLoadingMore(true);
    try {
      const more = await discoverService.getCandidates(10, activeCategory, candidates.length);
      if (more.length === 0) {
        setHasMore(false);
        setFeedExhausted(true);
      } else {
        setCandidates((prev) => [...prev, ...more]);
      }
    } catch (err) {
      console.error('loadMore failed:', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, user, activeCategory, candidates.length]);

  const reloadPopular = useCallback(async () => {
    if (!user) return;
    setLoadingMore(true);
    setFeedExhausted(false);
    setActiveCategory('popular');
    try {
      const popular = await discoverService.getCandidates(20, 'popular', 0);
      if (popular.length > 0) {
        setCandidates(popular);
        setCurrentIndex(0);
        setHasMore(true);
      }
    } catch (err) {
      console.error('reloadPopular failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    setVideoIsLandscape(false);
  }, [candidates[currentIndex]?.videoId]);

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
    if (currentIndex >= candidates.length - 2 && hasMore && !loadingMore) { loadMore(); }
    setCurrentIndex((prev) => Math.min(prev + 1, Math.max(0, candidates.length - 1)));
    setIsPlaying(false);
    setVideoProgress(0);
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, [candidates]);

  const advanceVideo = useCallback((direction: 'next' | 'prev') => {
    setCurrentIndex((prev) =>
      direction === 'next'
        ? Math.min(prev + 1, Math.max(0, candidates.length - 1))
        : Math.max(prev - 1, 0)
    );
    setIsPlaying(false);
    setVideoProgress(0);
  }, [candidates.length]);

  const resetDragVisual = useCallback(() => {
    if (videoCardRef.current) {
      videoCardRef.current.style.transition = '';
      videoCardRef.current.style.transform = '';
    }
    dragRef.current = { startX: 0, startY: 0, startTime: 0, direction: null };
    setSwipe({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, deltaX: 0, deltaY: 0 });
    setSwipeDirection(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: performance.now(),
      direction: null,
    };
    setSwipe({ isDragging: true, startX: touch.clientX, startY: touch.clientY, currentX: touch.clientX, currentY: touch.clientY, deltaX: 0, deltaY: 0 });
    if (videoCardRef.current) {
      videoCardRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const drag = dragRef.current;
    if (!swipeStateRef.current.isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;

    const rawX = touch.clientX - drag.startX;
    const rawY = touch.clientY - drag.startY;

    if (!drag.direction && (Math.abs(rawX) > 10 || Math.abs(rawY) > 10)) {
      drag.direction = Math.abs(rawX) > Math.abs(rawY) ? 'horizontal' : 'vertical';
      setSwipeDirection(
        drag.direction === 'horizontal'
          ? (rawX > 0 ? 'right' : 'left')
          : (rawY > 0 ? 'down' : 'up')
      );
    }

    const appliedX = drag.direction === 'horizontal' ? rawX : 0;
    const appliedY = drag.direction === 'vertical' ? rawY : 0;

    if (videoCardRef.current) {
      videoCardRef.current.style.transform = `translate3d(${appliedX}px, ${appliedY}px, 0)`;
    }

    // No preventDefault — .discoverPage has touch-action: none which handles this
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!swipeStateRef.current.isDragging) return;

    const drag = dragRef.current;
    const elapsed = Math.max(performance.now() - drag.startTime, 1);

    const card = videoCardRef.current;
    let releasedX = 0;
    let releasedY = 0;
    if (card) {
      const m = card.style.transform.match(/translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/);
      if (m) { releasedX = parseFloat(m[1]); releasedY = parseFloat(m[2]); }
    }

    const distanceThreshold = 80;
    const velocityThreshold = 0.5;

    const dx = drag.direction === 'horizontal' ? releasedX : 0;
    const dy = drag.direction === 'vertical' ? releasedY : 0;
    const velocity = (drag.direction === 'horizontal' ? dx : dy) / elapsed;

    const shouldNext = (dx < -distanceThreshold || velocity < -velocityThreshold)
      || (dy < -distanceThreshold || velocity < -velocityThreshold);
    const shouldPrev = (dx > distanceThreshold || velocity > velocityThreshold)
      || (dy > distanceThreshold || velocity > velocityThreshold);

    if (shouldNext) {
      if (currentIndex >= candidates.length - 2 && hasMore && !loadingMore) { loadMore(); }
      if (card) { card.style.transition = ''; card.style.transform = 'translate3d(-100vw, 0, 0)'; }
      setTimeout(() => {
        advanceVideo('next');
        resetDragVisual();
      }, 180);
    } else if (shouldPrev) {
      if (card) { card.style.transition = ''; card.style.transform = 'translate3d(100vw, 0, 0)'; }
      setTimeout(() => {
        advanceVideo('prev');
        resetDragVisual();
      }, 180);
    } else {
      resetDragVisual();
    }
  }, [advanceVideo, resetDragVisual]);

  const handleTouchCancel = useCallback(() => {
    resetDragVisual();
  }, [resetDragVisual]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.muted = false;
        setAudioUnlocked(true);
        videoRef.current.play().catch(() => {
          videoRef.current.muted = true;
          videoRef.current.play();
        });
        setIsPlaying(true);
      }
    }
  };


  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration > 0 && !isSeeking) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
      setVideoDuration(videoRef.current.duration);
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
      const result = await mediaService.uploadVideo(pendingVideo.file, user.id, 'discover_video', setUploadProgress);
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
        setShowPostedToast(true);
        setTimeout(() => setShowPostedToast(false), 3500);
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

  const handleDownloadClick = () => {
    setDownloadModalOpen(true);
  };

  const current = currentIndex < candidates.length ? candidates[currentIndex] : null;
  const swipesRemaining = dailyLimit - swipeCount;



  return (
    <div ref={containerRef} className={styles.discoverPage} data-theme="dark" onTouchStart={(e) => { if (!commentsOpen && !showPublishModal && !showMyVideos) handleTouchStart(e); }} onTouchMove={(e) => { if (!commentsOpen && !showPublishModal && !showMyVideos) handleTouchMove(e); }} onTouchEnd={(e) => { if (!commentsOpen && !showPublishModal && !showMyVideos) handleTouchEnd(e); }} onTouchCancel={(e) => { if (!commentsOpen && !showPublishModal && !showMyVideos) handleTouchCancel(); }} style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', overscrollBehavior: 'none' }}>
      {showOfflineToast && (
        <div className={styles.offlineToast}>
          <WifiOff size={14} />
          <span>You are offline. Cached videos still play.</span>
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.swipeMeta}>
          <span>{swipeCount}/{dailyLimit} swipes</span>
          <span className={styles.swipeRemaining}>{swipesRemaining} remaining</span>
          <span className={styles.swipeMetaDivider} />
          <button
            className={styles.popInlineButton}
            onClick={(e) => { e.stopPropagation(); setActiveCategory('popular'); setSearchModalOpen(true); }}
            aria-label="Popular videos"
          >
            Pop
          </button>
        </div>
        {isOffline && (
          <span className={styles.offlinePill}>
            <WifiOff size={12} />
            Offline
          </span>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button className={styles.headerButton} onClick={(e) => { e.stopPropagation(); setShowMyVideos(true); }} aria-label="My Videos">
            <Grid3x3 size={20} />
          </button>
        </div>
      </header>



      {/* Double-tap Like Animation */}
      {showLikeAnimation && (
        <div className={styles.likeAnimation}>
          <Heart size={100} fill="#fe2c55" />
        </div>
      )}

      <MyVideosSheet
        open={showMyVideos}
        videos={myVideos}
        theme={effectiveTheme}
        onClose={() => setShowMyVideos(false)}
        onUploadClick={() => { setShowMyVideos(false); videoInputRef.current?.click(); }}
        onVideoClick={(video) => { setPreviewVideo(video); setPreviewPlaying(true); }}
      />

      <VideoPreviewModal
        video={previewVideo}
        onClose={() => setPreviewVideo(null)}
        onToggleVisibility={handleToggleVideo}
        onDelete={handleDeleteVideo}
      />


      {pendingVideo && (
        <PostDetailsModal
          open={showPublishModal}
          videoUrl={pendingVideo.previewUrl}
          onClose={() => { if (!uploading) { URL.revokeObjectURL(pendingVideo.previewUrl); setPendingVideo(null); setShowPublishModal(false); } }}
          onPublish={handlePublish}
          uploading={uploading}
          uploadProgress={uploadProgress}
          theme={effectiveTheme}
        />
      )}

      {current && (
        <div ref={videoCardRef} className={styles.videoCard} onClick={handleDoubleTapLike}>
          <video ref={videoRef} src={current.videoUrl} loop playsInline autoPlay preload="auto" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} className={styles.video} style={{ objectFit: videoIsLandscape ? 'contain' : 'cover' }} onLoadedMetadata={() => { if (videoRef.current) { setVideoIsLandscape(videoRef.current.videoWidth > videoRef.current.videoHeight); } }} onClick={togglePlay} />
          {videoIsLandscape && (
            <button
              className={styles.landscapeExpandButton}
              onClick={async (e) => {
                e.stopPropagation();
                const vid = videoRef.current;
                if (!vid) return;
                try {
                  const anyVid = vid as any;
                  if (anyVid.webkitEnterFullscreen) {
                    anyVid.webkitEnterFullscreen();
                    return;
                  }
                  if (vid.requestFullscreen) {
                    await vid.requestFullscreen();
                    try { await (screen.orientation as any).lock('landscape'); } catch {}
                  }
                } catch (err) {
                  console.error('fullscreen failed:', err);
                }
              }}
              aria-label="Expand landscape video"
            >
              <Maximize2 size={14} />
              <span>Full screen</span>
            </button>
          )}
          {showHeartPop && <Heart size={60} className={styles.heartPop} fill="#fe2c55" />}
          {!isPlaying && <button className={styles.playOverlay} onClick={togglePlay}><svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}><path d="M8 5.14v13.72a1 1 0 0 0 1.5.87l11.13-6.86a1 1 0 0 0 0-1.74L9.5 4.27A1 1 0 0 0 8 5.14z" /></svg></button>}
          


          <div className={styles.infoOverlay}>
            <div className={styles.infoNameRow}>
              <span className={styles.infoName}>
                {current.displayName}{current.age ? ", " + current.age : ""}
              </span>
              {current.isVerified && <BadgeCheck size={14} style={{ color: "#3b82f6", verticalAlign: "middle", marginLeft: 4 }} />}
            </div>
            {current.bio && (() => {
              const expanded = expandedCaptions.has(current.videoId);
              const isLong = (current.bio || "").length > 80;
              const toggle = () => {
                if (!isLong) return;
                setExpandedCaptions((prev) => {
                  const next = new Set(prev);
                  if (next.has(current.videoId)) next.delete(current.videoId);
                  else next.add(current.videoId);
                  return next;
                });
              };
              return (
                <p className={isLong && !expanded ? styles.infoCaption + " " + styles.infoCaptionCollapsed : styles.infoCaption} onClick={toggle}>
                  {current.bio}
                  {isLong && (
                    <span className={styles.infoCaptionExpandHint} onClick={(e) => { e.stopPropagation(); toggle(); }}>
                      {expanded ? " Show less" : " Read more"}
                    </span>
                  )}
                </p>
              );
            })()}
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
                <span>{current.locationText || [current.city, current.state].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </div>

          <div 
            ref={progressBarRef}
            className={styles.progressBarWrapper}
            data-seeking={isSeeking}
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

          </div>

          <div className={styles.rightActions}>
            <button
              className={styles.rightAvatarButton + (current && ringState[current.userId] ? ' ' + (ringState[current.userId] === 'unseen' ? styles.hasStory : styles.hasStorySeen) : '')}
              onClick={(e) => { e.stopPropagation(); if (current && ringState[current.userId]) { videoRef.current?.pause(); setStoryViewerAuthorId(current.userId); setStoryViewerOpen(true); } else { navigate('/profile/' + current.userId); } }}
              aria-label={'View ' + current.displayName + ' profile'}
            >
              {current.avatarUrl
                ? <img src={current.avatarUrl} alt={current.displayName} />
                : <span>{current.displayName.charAt(0)}</span>}
              {current && (
                <span
                  className={styles.profilePlusBadge}
                  onClick={(e) => { e.stopPropagation(); navigate('/profile/' + current.userId); }}
                  role="button"
                  aria-label="View profile"
                >
                  <Plus />
                </span>
              )}
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
              <svg width="28" height="28" viewBox="0 0 24 24" fill={likedIds.has(current.videoId) ? "#ffffff" : "none"} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <div className={styles.likeCount}>
              {formatCount(likeCounts[current.videoId] || 0)}
            </div>
            {current.allowComments && (
              <>
              <button
                onClick={(e) => { e.stopPropagation(); setCommentsVideoId(current.videoId); setCommentsOpen(true); }}
                className={styles.rightActionButton}
                aria-label="Comment"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              </button>
              <div className={styles.likeCount}>
                {formatCount(commentCounts[current.videoId] !== undefined ? commentCounts[current.videoId] : (current.commentCount || 0))}
              </div>
              </>
            )}
            <button
              className={styles.rightActionButton}
              onClick={async (e) => {
                e.stopPropagation();
                const shareUrl = window.location.origin + '/profile/' + current.userId;
                if (navigator.share) {
                  navigator.share({ title: current.displayName, url: shareUrl }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(shareUrl).catch(() => {});
                }

                // Optimistic update
                setShareCounts((prev) => ({
                  ...prev,
                  [current.videoId]: (prev[current.videoId] || 0) + 1,
                }));

                // Persist to DB
                supabase.rpc('increment_video_share', { p_video_id: current.videoId }).then();
              }}
              aria-label="Share"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <div className={styles.likeCount}>
              {formatCount(shareCounts[current.videoId] || 0)}
            </div>
            <button
              className={styles.rightActionButton}
              onClick={(e) => { e.stopPropagation(); handleDownloadClick(); }}
              aria-label="Download video"
            >
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        </div>
      )}

      <StoryViewer
        open={storyViewerOpen}
        onClose={() => { setStoryViewerOpen(false); setStoryViewerAuthorId(null); }}
        initialAuthorId={storyViewerAuthorId}
      />
      <DownloadModal
        open={downloadModalOpen}
        videoUrl={current?.videoUrl || null}
        thumbnailUrl={current?.thumbnailUrl || null}
        videoId={current?.videoId || null}
        downloadEnabled={current?.downloadEnabled ?? false}
        theme={effectiveTheme}
        onClose={() => setDownloadModalOpen(false)}
      />

      <DiscoverCommentsSheet
        open={commentsOpen}
        videoId={commentsVideoId}
        currentUserId={user?.id || null}
        theme={effectiveTheme}
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

      {showPostedToast && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-text)',
          color: 'var(--color-surface)',
          padding: '12px 20px',
          borderRadius: 9999,
          fontSize: 14,
          fontWeight: 600,
          zIndex: 2000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <CheckCircle2 size={18} />
          Video posted for review
        </div>
      )}

      <DiscoverSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onAvatarClick={(userId) => navigate('/profile/' + userId)}
        theme={effectiveTheme}
        onVideoSelect={(video, allResults) => {
          // Convert ALL search results to DiscoverCandidate format,
          // so swiping up/down steps through the full search list.
          const mapped: DiscoverCandidate[] = allResults.map((v) => ({
            userId: v.user_id,
            videoId: v.video_id,
            displayName: v.display_name,
            avatarUrl: v.avatar_url,
            videoUrl: v.video_url,
            thumbnailUrl: v.thumbnail_url,
            bio: v.caption || null,
            age: null,
            city: null,
            state: null,
            relationshipIntent: null,
            interests: [],
            isVerified: v.is_verified,
            verificationBadge: v.is_verified ? 'verified' : '',
            distanceKm: 0,
            hashtags: v.hashtags || [],
            locationText: v.location_text,
            allowComments: true,
            allowDuet: true,
            likeCount: v.like_count,
            userLiked: false,
            commentCount: 0,
          }));
          const clickedIdx = mapped.findIndex((m) => m.videoId === video.video_id);

          // Populate likeCounts from the search results
          const newLikeCounts: Record<string, number> = {};
          allResults.forEach((v) => { newLikeCounts[v.video_id] = v.like_count || 0; });
          setLikeCounts(newLikeCounts);

          // Fetch comment counts for all search results in one query
          const videoIds = mapped.map((m) => m.videoId);
          if (videoIds.length > 0) {
            supabase
              .from('discover_videos')
              .select('id, comment_count, share_count')
              .in('id', videoIds)
              .then(({ data }) => {
                if (data) {
                  const newCommentCounts: Record<string, number> = {};
                  data.forEach((row: any) => { newCommentCounts[row.id] = row.comment_count || 0; });
                  setCommentCounts((prev) => ({ ...prev, ...newCommentCounts }));
                }
              });
          }

          setCandidates(mapped);
          setCurrentIndex(clickedIdx >= 0 ? clickedIdx : 0);
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

      {feedExhausted && activeCategory === 'new' && current && currentIndex >= candidates.length - 1 && (
        <div className={styles.caughtUpCard}>
          <div className={styles.caughtUpIcon}>
            <Heart size={32} fill="#f97316" />
          </div>
          <h3 className={styles.caughtUpTitle}>You're all caught up</h3>
          <p className={styles.caughtUpText}>Here are some popular videos you might have missed</p>
          <button
            className={styles.caughtUpButton}
            onClick={reloadPopular}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'See popular videos'}
          </button>
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
      <BottomNav />
    </div>
  );
};






















