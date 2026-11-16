import { useEffect, useState, useCallback } from 'react';
import { discoverService } from '../../discover/services/discover.service';
import type { DiscoverCandidate } from '../../discover/types/discover.types';
import { ReelCard } from './ReelCard';
import { ShareSheet } from './ShareSheet';
import { useSeenReels } from '../hooks/useSeenReels';
import styles from '../styles/SimilarVideosSection.module.css';

interface SimilarVideosSectionProps {
  location?: string | null;
  excludeVideoIds?: string[];
  onOpenVideo: (videoId: string) => void;
}

const FETCH_LIMIT = 20;
const DISPLAY_LIMIT = 10;

export function SimilarVideosSection({ location, excludeVideoIds = [], onOpenVideo }: SimilarVideosSectionProps) {
  const [videos, setVideos] = useState<DiscoverCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { seen, markSeen, ready } = useSeenReels();

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await discoverService.getCandidates(FETCH_LIMIT, 'popular', 0, location || null);
      setVideos(results);
    } catch (err) {
      console.error('Failed to fetch similar videos:', err);
      setError('Could not load similar videos');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (!ready) return;
    fetchVideos();
  }, [ready, fetchVideos]);

  const handleNotInterested = useCallback((videoId: string) => {
    markSeen(videoId);
    setVideos((prev) => prev.filter((v) => v.videoId !== videoId));
  }, [markSeen]);

  const handleShare = useCallback((video: DiscoverCandidate) => {
    if (typeof window === 'undefined') return;
    setShareUrl(`${window.location.origin}/discover?video=${video.videoId}`);
  }, []);

  const handleSeen = useCallback((videoId: string) => {
    markSeen(videoId);
  }, [markSeen]);

  const excludeSet = new Set(excludeVideoIds);
  const filtered = videos
    .filter((v) => !seen.has(v.videoId) && !excludeSet.has(v.videoId))
    .slice(0, DISPLAY_LIMIT);

  if (loading) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>Check out more similar videos</h3>
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>Check out more similar videos</h3>
        <p className={styles.emptyText}>{error}</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>Check out more similar videos</h3>
        <p className={styles.emptyText}>No more videos to show right now.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.title}>Check out more similar videos</h3>
        <div className={styles.grid}>
          {filtered.map((video) => (
            <ReelCard
              key={video.videoId}
              video={video}
              onOpen={onOpenVideo}
              onNotInterested={handleNotInterested}
              onShare={handleShare}
              onSeen={handleSeen}
            />
          ))}
        </div>
      </div>
      <ShareSheet
        open={Boolean(shareUrl)}
        onClose={() => setShareUrl(null)}
        postUrl={shareUrl || ''}
      />
    </>
  );
}

