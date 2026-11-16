import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { PostMedia as PostMediaType } from '../types/community.types';
import { useVideoPlayback } from '../context/VideoPlaybackContext';
import styles from '../styles/PostMedia.v2.module.css';
import { VideoPlayerControls } from './VideoPlayerControls';

interface PostMediaProps {
  media: PostMediaType[];
  onImageClick: (imageIndex: number) => void;
  onVideoExpand?: (videoUrl: string, startTimeSeconds: number) => void;
}

type Format = 'empty' | 'photo' | 'video' | 'mixed';

function detectFormat(media: PostMediaType[]): Format {
  if (media.length === 0) return 'empty';
  const hasImage = media.some((m) => m.type === 'image');
  const hasVideo = media.some((m) => m.type === 'video');
  if (hasImage && hasVideo) return 'mixed';
  if (hasVideo) return 'video';
  return 'photo';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

export const PostMedia: React.FC<PostMediaProps> = ({ media, onImageClick, onVideoExpand }) => {
  const format = detectFormat(media);
  if (format === 'empty') return null;

  const images = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type === 'video');

  if (format === 'photo') {
    return <PhotoGrid images={images} onImageClick={onImageClick} />;
  }

  if (format === 'video') {
    return (
      <div className={styles.videoStack}>
        {videos.map((v) => (<VideoTile key={v.id} item={v} onExpand={onVideoExpand} />))}
      </div>
    );
  }

  return (
    <div className={styles.mixedStack}>
      {images.length > 0 && <PhotoGrid images={images} onImageClick={onImageClick} />}
      {videos.length > 0 && (
        <div className={styles.videoStack}>
          {videos.map((v) => (<VideoTile key={v.id} item={v} onExpand={onVideoExpand} />))}
        </div>
      )}
    </div>
  );
};

interface PhotoGridProps {
  images: PostMediaType[];
  onImageClick: (imageIndex: number) => void;
}

function PhotoGrid({ images, onImageClick }: PhotoGridProps) {
  const count = images.length;

  if (count === 1) {
    const item = images[0]!;
    return (
      <div className={styles.photoSingle} onClick={() => onImageClick(0)}>
        <img src={item.url} alt="" loading="lazy" className={styles.photoSingleImg} />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className={styles.photoTwo}>
        {images.map((img, i) => (
          <div key={img.id} className={styles.photoCell} onClick={() => onImageClick(i)}>
            <img src={img.url} alt="" loading="lazy" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={styles.photoThree}>
        <div className={styles.photoThreeLarge} onClick={() => onImageClick(0)}>
          <img src={images[0]!.url} alt="" loading="lazy" />
        </div>
        <div className={styles.photoThreeSmall} onClick={() => onImageClick(1)}>
          <img src={images[1]!.url} alt="" loading="lazy" />
        </div>
        <div className={styles.photoThreeSmall} onClick={() => onImageClick(2)}>
          <img src={images[2]!.url} alt="" loading="lazy" />
        </div>
      </div>
    );
  }

  const visible = images.slice(0, 4);
  const extra = count - 4;

  return (
    <div className={styles.photoFour}>
      {visible.map((img, i) => (
        <div key={img.id} className={styles.photoCell} onClick={() => onImageClick(i)}>
          <img src={img.url} alt="" loading="lazy" />
          {i === 3 && extra > 0 && (
            <div className={styles.photoExtraOverlay}>+{extra}</div>
          )}
        </div>
      ))}
    </div>
  );
}

interface VideoTileProps {
  item: PostMediaType;
  onExpand?: (videoUrl: string, startTimeSeconds: number) => void;
}

function VideoTile({ item, onExpand }: VideoTileProps) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(
    item.durationSeconds && item.durationSeconds > 0 ? item.durationSeconds : null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playback = useVideoPlayback();

  // Mount-muted autoplay: browsers block unmuted autoplay without a direct
  // gesture on the <video> element. Play muted, user unmutes via controls.
  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, [playing]);
  const videoId = item.id;

  useEffect(() => {
    playback.registerVideo(videoId, () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    });
    return () => playback.unregisterVideo(videoId);
  }, [videoId, playback]);



  const handlePlayClick = () => {
    playback.onPlay(videoId);
    setPlaying(true);
  };

  const handleEnded = () => {
    setPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleVideoTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (e.target !== e.currentTarget) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.muted = false;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    }
  };

  if (!playing) {
    return (
      <div className={styles.videoPosterWrapper} onClick={handlePlayClick}>
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className={styles.videoPoster} loading="lazy" />
        ) : (
          <video
            src={item.url}
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            className={styles.videoPoster}
          />
        )}
        <div className={styles.playButtonOverlay}>
          <Play size={28} fill="#fff" color="#fff" />
        </div>
        {duration !== null && (
          <span className={styles.durationBadge}>{formatDuration(duration)}</span>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.videoPlayerWrapper}>
      <video
        ref={videoRef}
        src={item.url}
        poster={item.thumbnailUrl ?? undefined}
        autoPlay
        muted
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={handleVideoTap}
        className={styles.videoPlayerNoControls}
      />
      <VideoPlayerControls
        videoRef={videoRef}
        containerRef={containerRef}
        onPlayingChange={(isPlaying) => {
          if (!isPlaying && videoRef.current && videoRef.current.ended) {
            setPlaying(false);
          }
        }}
        onExpand={onExpand ? () => {
          if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            videoRef.current.pause();
            onExpand(item.url, currentTime);
          }
        } : undefined}
      />
    </div>
  );
}
