import React, { useState, useRef, useCallback } from 'react';
import { Check, CheckCheck, AlertCircle, RotateCcw, Reply, Copy, Flag, ExternalLink, Play, Pause, Heart, Pencil, Trash2, Pin, Forward, Smile, X } from 'lucide-react';
import { ChatMessage } from '../../types/chat.types';
import { ImagePreviewModal } from '../../community/components/ImagePreviewModal';
import styles from '../styles/MessageBubble.module.css';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  id?: string;
  showSenderName?: boolean;
  onRetry?: (messageId: string, content: string) => void;
  onReply?: (message: ChatMessage) => void;
  onReportMessage?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onForward?: (message: ChatMessage) => void;
  onPin?: (message: ChatMessage) => void;
  onReact?: (message: ChatMessage, reaction: string) => void;
  reactions?: { reaction: string; count: number; reactedByMe: boolean }[];
  isPinned?: boolean;
  onOpenActionSheet?: (message: ChatMessage) => void;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  id,
  showSenderName = false,
  onRetry,
  onReply,
  onReportMessage,
  onEdit,
  onDelete,
  onForward,
  onPin,
  onReact,
  reactions = [],
  isPinned = false,
  onOpenActionSheet,
}) => {
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkConfirmUrl, setLinkConfirmUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState('');
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);
  const isFailed = message.status === 'failed';
  const isDeleted = message.deleted_for_everyone;

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending': return <span className={styles.sendingDot} />;
      case 'sent': return <Check size={14} />;
      case 'delivered': return <CheckCheck size={14} />;
      case 'read': return <CheckCheck size={14} className={styles.readIcon} />;
      case 'failed': return <AlertCircle size={14} className={styles.failedIcon} />;
      default: return <Check size={14} />;
    }
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      if (message.type === 'text' && !isDeleted) {
        onReact?.(message, '❤️');
      }
    } else {
      lastTapRef.current = now;
    }
  }, [message, onReact, isDeleted]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTimerRef.current = setTimeout(() => {
      if (onOpenActionSheet) {
        onOpenActionSheet(message);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    if (Math.abs(deltaX) > 50 && deltaY < 30) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      
      if (!isDeleted && onReply) {
        onReply(message);
      }
      
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const extractUrls = (content: string): string[] => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return content.match(urlPattern) || [];
  };

  const handleVideoClick = () => {
    setVideoModalOpen(true);
  };

  const renderContent = () => {
    if (isDeleted) {
      return <p className={styles.deletedMessage}>This message was deleted</p>;
    }

    if (message.type === 'image' && message.metadata?.imageUrl) {
      return (
        <div className={styles.imageMessageContainer}>
          <img src={message.metadata.thumbnailUrl || message.metadata.imageUrl} alt="" loading="lazy" className={styles.imageMessage} onClick={() => setImagePreviewOpen(true)} />
        </div>
      );
    }

    if (message.type === 'video' && message.metadata?.videoUrl) {
      return (
        <div className={styles.videoMessageContainer} onClick={handleVideoClick}>
          <video 
            ref={videoRef}
            src={message.metadata.videoUrl} 
            className={styles.videoMessage}
            preload="metadata"
            playsInline
            muted
            onLoadedMetadata={(e) => {
              const duration = e.currentTarget.duration;
              if (duration && duration !== Infinity) {
                setVideoDuration(formatTime(duration));
              }
            }}
          />
          <div className={styles.videoPlayButton}>
            <Play size={20} color="#fff" fill="#fff" />
          </div>
          {videoDuration && (
            <span className={styles.videoDurationBadge}>{videoDuration}</span>
          )}
        </div>
      );
    }

    if (message.type === 'gift' && message.metadata?.giftIcon) {
      return <div className={styles.giftMessageContainer}><span className={styles.giftIcon}>{message.metadata.giftIcon}</span><span className={styles.giftName}>{message.metadata.giftName || 'Gift'}</span></div>;
    }

    const urls = extractUrls(message.content);
    if (urls.length > 0) {
      let remaining = message.content;
      const parts: React.ReactNode[] = [];
      urls.forEach((url, index) => {
        const partsOfUrl = remaining.split(url);
        if (partsOfUrl[0]) {
          parts.push(<span key={`text-${index}`}>{partsOfUrl[0]}</span>);
        }
        parts.push(
          <button key={`link-${index}`} className={styles.inlineLink} onClick={() => setLinkConfirmUrl(url)}>
            <ExternalLink size={12} />
            {url.length > 30 ? url.substring(0, 30) + '...' : url}
          </button>
        );
        remaining = partsOfUrl[1] || '';
      });
      if (remaining) parts.push(<span key="text-end">{remaining}</span>);
      return <p className={styles.content}>{parts}</p>;
    }

    return <p className={styles.content}>{message.content}</p>;
  };

  return (
    <div 
      id={id}
      className={`${styles.wrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}
      onMouseEnter={() => setShowQuickReactions(true)}
      onMouseLeave={() => setShowQuickReactions(false)}
    >
      {isPinned && (
        <div className={styles.pinnedBadge}><Pin size={10} /> Pinned</div>
      )}
      
      <div
        className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble} ${isFailed ? styles.failedBubble : ''}`}
        onDoubleClick={handleDoubleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {!isOwn && showSenderName && <span className={styles.senderName}>{message.senderName}</span>}
        
        {message.metadata?.replyToId && (
          <div className={styles.replyPreview}>
            <div className={styles.replyPreviewHeader}>
              <Reply size={10} />
              <span>{message.metadata.replyToSenderName}</span>
            </div>
            <p className={styles.replyPreviewContent}>
              {message.metadata.replyToContent || 'Message'}
            </p>
          </div>
        )}
        
        {renderContent()}
        
        {reactions.length > 0 && (
          <div className={styles.reactionBadges}>
            {reactions.map((r, i) => (
              <button 
                key={`${r.reaction}-${i}`} 
                className={`${styles.reactionBadge} ${r.reactedByMe ? styles.reactionBadgeActive : ''}`}
                onClick={() => onReact?.(message, r.reaction)}
                title={`${r.reaction} ${r.count}`}
              >
                <span className={styles.reactionEmoji}>{r.reaction}</span>
                {r.count > 1 && <span className={styles.reactionCount}>{r.count}</span>}
              </button>
            ))}
          </div>
        )}
        
        <div className={styles.meta}>
          <span className={styles.timestamp}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {message.edited_at && <span className={styles.editedLabel}>edited</span>}
          {isOwn && <span className={styles.status}>{getStatusIcon()}</span>}
        </div>

        {isFailed && onRetry && (
          <button className={styles.retryButton} onClick={() => onRetry(message.id, message.content)}>
            <RotateCcw size={12} />
            Retry
          </button>
        )}
      </div>

      {showQuickReactions && !isDeleted && (
        <div className={`${styles.quickReactionsOverlay} ${isOwn ? styles.quickReactionsLeft : styles.quickReactionsRight}`}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={styles.quickReactionButton}
              onClick={() => {
                onReact?.(message, emoji);
                setShowQuickReactions(false);
              }}
            >
              {emoji}
            </button>
          ))}
          <button
            className={styles.quickReactionButton}
            onClick={() => {
              onOpenActionSheet?.(message);
              setShowQuickReactions(false);
            }}
          >
            <Smile size={16} />
          </button>
        </div>
      )}

      {linkConfirmUrl && (
        <div className={styles.linkConfirmOverlay} onClick={() => setLinkConfirmUrl(null)}>
          <div className={styles.linkConfirmDialog} onClick={(e) => e.stopPropagation()}>
            <p className={styles.linkConfirmTitle}>You're leaving the app</p>
            <p className={styles.linkConfirmText}>This link may lead to an external website. Only continue if you trust the person who sent it.</p>
            <div className={styles.linkConfirmActions}>
              <button className={styles.linkCancelButton} onClick={() => setLinkConfirmUrl(null)}>Cancel</button>
              <button className={styles.linkOpenButton} onClick={() => { window.open(linkConfirmUrl, '_blank', 'noopener,noreferrer'); setLinkConfirmUrl(null); }}>Open</button>
            </div>
          </div>
        </div>
      )}

      {message.type === 'image' && message.metadata?.imageUrl && (
        <ImagePreviewModal open={imagePreviewOpen} images={[message.metadata.imageUrl]} currentIndex={0} onClose={() => setImagePreviewOpen(false)} onNext={() => {}} onPrev={() => {}} />
      )}

      {message.type === 'video' && message.metadata?.videoUrl && videoModalOpen && (
        <div className={styles.videoModalOverlay} onClick={() => setVideoModalOpen(false)}>
          <div className={styles.videoModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.videoModalClose} onClick={() => setVideoModalOpen(false)}>
              <X size={24} />
            </button>
            <video 
              src={message.metadata.videoUrl} 
              autoPlay
              className={styles.videoModalPlayer}
              playsInline
              onClick={(e) => {
                const video = e.currentTarget;
                if (video.paused) {
                  video.play();
                } else {
                  video.pause();
                }
              }}
            />
            <div className={styles.videoModalControls}>
              <button className={styles.videoModalControlButton} onClick={(e) => {
                const video = document.querySelector('.' + styles.videoModalPlayer) as HTMLVideoElement;
                if (video) {
                  if (video.paused) {
                    video.play();
                  } else {
                    video.pause();
                  }
                }
              }}>
                <Play size={16} />
              </button>
              <input 
                type="range" 
                className={styles.videoModalSeekbar}
                min="0"
                max="100"
                defaultValue="0"
                onChange={(e) => {
                  const video = document.querySelector('.' + styles.videoModalPlayer) as HTMLVideoElement;
                  if (video && video.duration) {
                    video.currentTime = (parseInt(e.target.value) / 100) * video.duration;
                  }
                }}
              />
              <span className={styles.videoModalTime}>0:00</span>
              <button className={styles.videoModalControlButton} onClick={(e) => {
                const video = document.querySelector('.' + styles.videoModalPlayer) as HTMLVideoElement;
                if (video) {
                  if (video.requestFullscreen) {
                    video.requestFullscreen();
                  }
                }
              }}>
                <span className={styles.videoModalFullscreenIcon}>⛶</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




