import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/StoryStudio.module.css';

interface TrimFilmstripProps {
  src: string;
  duration: number;
  frameCount?: number;
}

const DEFAULT_FRAMES = 8;
const FRAME_W = 60;
const FRAME_H = 80;

// Module-level cache — survives component unmount, so re-opening the
// same draft doesn't regenerate frames.
const frameCache = new Map<string, string[]>();

export const TrimFilmstrip: React.FC<TrimFilmstripProps> = ({
  src,
  duration,
  frameCount = DEFAULT_FRAMES,
}) => {
  const [frames, setFrames] = useState<string[]>(() => frameCache.get(src) || []);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!src || !duration || duration <= 0) {
      setFrames([]);
      return;
    }
    const cached = frameCache.get(src);
    if (cached && cached.length === frameCount) {
      setFrames(cached);
      return;
    }

    setLoading(true);
    setFrames([]);
    let cancelled = false;

    (async () => {
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.preload = 'auto';
        video.src = src;

        await new Promise<void>((res, rej) => {
          video.onloadedmetadata = () => res();
          video.onerror = () => rej(new Error('filmstrip: video load failed'));
        });

        const canvas = document.createElement('canvas');
        canvas.width = FRAME_W;
        canvas.height = FRAME_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('filmstrip: canvas unavailable');

        const times: number[] = [];
        for (let i = 0; i < frameCount; i++) {
          // Space frames evenly, but avoid the very last frame (often black)
          const t = (duration * i) / frameCount;
          times.push(Math.min(t, Math.max(0, duration - 0.05)));
        }

        const out: string[] = [];
        for (const t of times) {
          if (cancelled || !mountedRef.current) return;
          await new Promise<void>((res, rej) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              res();
            };
            video.addEventListener('seeked', onSeeked);
            try { video.currentTime = t; } catch { rej(new Error('seek failed')); }
          });
          if (cancelled || !mountedRef.current) return;

          // Center-crop to 60x80 (portrait)
          const srcW = video.videoWidth || FRAME_W;
          const srcH = video.videoHeight || FRAME_H;
          const targetAspect = FRAME_W / FRAME_H;
          const srcAspect = srcW / srcH;
          let cropW: number, cropH: number, cropX: number, cropY: number;
          if (srcAspect > targetAspect) {
            cropH = srcH; cropW = srcH * targetAspect;
            cropX = (srcW - cropW) / 2; cropY = 0;
          } else {
            cropW = srcW; cropH = srcW / targetAspect;
            cropX = 0; cropY = (srcH - cropH) / 2;
          }

          try {
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, FRAME_W, FRAME_H);
            out.push(canvas.toDataURL('image/jpeg', 0.6));
          } catch (drawErr) {
            // toDataURL throws on cross-origin video without CORS headers
            console.warn('[filmstrip] frame draw failed', drawErr);
            throw drawErr;
          }
        }

        if (cancelled || !mountedRef.current) return;
        frameCache.set(src, out);
        setFrames(out);
      } catch (err) {
        console.warn('[filmstrip] generation failed, falling back to flat track', err);
        if (!cancelled && mountedRef.current) setFrames([]);
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [src, duration, frameCount]);

  if (frames.length === 0) return null;

  return (
    <div className={styles.trimFilmstrip} aria-hidden="true">
      {frames.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className={styles.trimFilmstripImg}
          draggable={false}
        />
      ))}
    </div>
  );
};