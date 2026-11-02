import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../types/chat.types';
import { ImagePreviewModal } from '../../community/components/ImagePreviewModal';
import styles from './MediaGroup.module.css';

interface MediaGroupProps {
  messages: ChatMessage[];
  isOwn: boolean;
  showSenderName: boolean;
  onOpenActionSheet: (message: ChatMessage) => void;
}

const isMedia = (m: ChatMessage): boolean => {
  if (m.type !== 'image' && m.type !== 'video') return false;
  return Boolean(m.metadata?.imageUrl || m.metadata?.videoUrl);
};

export const canGroupWith = (prev: ChatMessage, next: ChatMessage): boolean => {
  if (!isMedia(prev) || !isMedia(next)) return false;
  if (prev.senderId !== next.senderId) return false;
  if (prev.metadata?.replyToId || next.metadata?.replyToId) return false;
  const delta = Math.abs(new Date(next.createdAt).getTime() - new Date(prev.createdAt).getTime());
  return delta <= 30000;
};

const VideoThumb: React.FC<{ src: string }> = ({ src }) => {
  const [thumbUrl, setThumbUrl] = useState('');
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    let settled = false;
    const fail = () => { if (!settled && !cancelled) { settled = true; setThumbUrl(''); } };
    v.onloadeddata = () => { v.currentTime = 0.1; };
    v.onseeked = () => {
      if (cancelled || settled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth || 320;
        canvas.height = v.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) { fail(); return; }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        settled = true;
        setThumbUrl(canvas.toDataURL('image/jpeg', 0.7));
      } catch { fail(); }
    };
    v.onerror = fail;
    setTimeout(fail, 3000);
    v.src = src;
    return () => { cancelled = true; };
  }, [src]);

  if (!thumbUrl) {
    return <video src={src} className={styles.cellVideo} preload="metadata" muted playsInline />;
  }
  return <img src={thumbUrl} alt="" className={styles.cellVideo} />;
};

export const MediaGroup: React.FC<MediaGroupProps> = ({ messages, isOwn, showSenderName, onOpenActionSheet }) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);

  const imageMessages = messages.filter((m) => m.type === 'image');
  const imageUrls = imageMessages.map((m) => m.metadata?.imageUrl || '').filter(Boolean);

  const captionMessage = messages.slice().reverse().find((m) => {
    const c = (m.content || '').trim();
    return c.length > 0 && c !== 'Photo' && c !== 'Video';
  });
  const caption = captionMessage ? captionMessage.content : '';

  const count = messages.length;
  const gridClass = count === 2 ? styles.grid2 : count === 3 ? styles.grid3 : styles.grid4;

  const openMessage = (m: ChatMessage, idx: number) => {
    if (m.type === 'image') {
      const imgIdx = imageMessages.findIndex((im) => im.id === m.id);
      if (imgIdx >= 0) setPreviewIndex(imgIdx);
    } else if (m.type === 'video') {
      setVideoIndex(idx);
    }
  };

  const closePreview = () => setPreviewIndex(null);
  const nextImage = () => setPreviewIndex((i) => (i === null ? 0 : (i + 1) % imageUrls.length));
  const prevImage = () => setPreviewIndex((i) => (i === null ? 0 : (i - 1 + imageUrls.length) % imageUrls.length));

  return (
    <div className={`${styles.wrapper} ${isOwn ? styles.own : styles.other}`}>
      {showSenderName && (
        <div className={styles.senderName}>{messages[0].senderName}</div>
      )}
      <div className={`${styles.group} ${gridClass}`}>
        {messages.map((m, i) => (
          <div
            key={m.id}
            className={styles.cell}
            onClick={() => openMessage(m, i)}
            onContextMenu={(e) => { e.preventDefault(); onOpenActionSheet(m); }}
          >
            {m.type === 'image' && (
              <img
                src={m.metadata?.thumbnailUrl || m.metadata?.imageUrl}
                alt=""
                loading="lazy"
                className={styles.cellImage}
              />
            )}
            {m.type === 'video' && (
              <div className={styles.cellVideoWrap}>
                <VideoThumb src={m.metadata?.videoUrl || ''} />
                <div className={styles.playBadge}>&#9654;</div>
              </div>
            )}
          </div>
        ))}
      </div>
      {caption && <div className={styles.caption}>{caption}</div>}

      {previewIndex !== null && imageUrls.length > 0 && (
        <ImagePreviewModal
          open={true}
          images={imageUrls}
          currentIndex={previewIndex}
          onClose={closePreview}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}

      {videoIndex !== null && messages[videoIndex]?.metadata?.videoUrl && (
        <div className={styles.videoModal} onClick={() => setVideoIndex(null)}>
          <video
            src={messages[videoIndex].metadata?.videoUrl}
            controls
            autoPlay
            playsInline
            className={styles.videoModalPlayer}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
