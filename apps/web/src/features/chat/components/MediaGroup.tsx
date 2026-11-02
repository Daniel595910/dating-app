import React, { useState } from 'react';
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

export const MediaGroup: React.FC<MediaGroupProps> = ({ messages, isOwn, showSenderName, onOpenActionSheet }) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);

  const imageMessages = messages.filter((m) => m.type === 'image');
  const imageUrls = imageMessages.map((m) => m.metadata?.imageUrl || '').filter(Boolean);

  const captionMessage = messages.slice().reverse().find((m) => (m.content || '').trim().length > 0);
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
                <video
                  src={m.metadata?.videoUrl}
                  className={styles.cellVideo}
                  preload="metadata"
                  muted
                  playsInline
                />
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