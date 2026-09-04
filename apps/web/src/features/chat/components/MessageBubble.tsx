import React, { useState, useRef } from 'react';
import { Check, CheckCheck, AlertCircle, RotateCcw, Reply, Copy, Flag, ExternalLink, Play, Pause } from 'lucide-react';
import { ChatMessage } from '../../types/chat.types';
import { ImagePreviewModal } from '../../community/components/ImagePreviewModal';
import styles from '../styles/MessageBubble.module.css';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSenderName?: boolean;
  onRetry?: (messageId: string, content: string) => void;
  onReply?: (message: ChatMessage) => void;
  onReportMessage?: (message: ChatMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showSenderName = false,
  onRetry,
  onReply,
  onReportMessage,
}) => {
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkConfirmUrl, setLinkConfirmUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFailed = message.status === 'failed';

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <span className={styles.sendingDot} />;
      case 'sent':
        return <Check size={14} />;
      case 'delivered':
        return <CheckCheck size={14} />;
      case 'read':
        return <CheckCheck size={14} className={styles.readIcon} />;
      case 'failed':
        return <AlertCircle size={14} className={styles.failedIcon} />;
      default:
        return <Check size={14} />;
    }
  };

  const handleBubbleClick = () => {
    if (message.type === 'text') {
      setShowActions((prev) => !prev);
    }
  };

  const handleLongPressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowActions(false); }, 1500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = message.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowActions(false); }, 1500);
    }
  };

  const handleReply = () => {
    setShowActions(false);
    onReply?.(message);
  };

  const handleReport = () => {
    setShowActions(false);
    onReportMessage?.(message);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
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

  const handleLinkClick = (url: string) => {
    setLinkConfirmUrl(url);
  };

  const renderContent = () => {
    if (message.type === 'image' && message.metadata?.imageUrl) {
      return (
        <div className={styles.imageMessageContainer}>
          <img
            src={message.metadata.thumbnailUrl || message.metadata.imageUrl}
            alt=""
            loading="lazy"
            className={styles.imageMessage}
            onClick={() => setImagePreviewOpen(true)}
          />
        </div>
      );
    }

    if (message.type === 'voice' && message.metadata) {
      const audioUrl = message.metadata.audioUrl || message.content;
      const duration = message.metadata.durationMs ? message.metadata.durationMs / 1000 : 0;
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

      return (
        <div className={styles.voiceMessageContainer}>
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            preload="metadata"
            style={{ display: 'none' }}
          />
          <button
            className={styles.voicePlayButton}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <div className={styles.voiceProgressTrack}>
            <div
              className={styles.voiceProgressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.voiceDuration}>
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>
        </div>
      );
    }

    if (message.type === 'gift' && message.metadata?.giftIcon) {
      return (
        <div className={styles.giftMessageContainer}>
          <span className={styles.giftIcon}>{message.metadata.giftIcon}</span>
          <span className={styles.giftName}>{message.metadata.giftName || 'Gift'}</span>
        </div>
      );
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
          <button key={`link-${index}`} className={styles.inlineLink} onClick={() => handleLinkClick(url)}>
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
    <div className={`${styles.wrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}>
      <div
        className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble} ${isFailed ? styles.failedBubble : ''} ${showActions ? styles.bubbleActive : ''}`}
        onClick={handleBubbleClick}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
      >
        {!isOwn && showSenderName && (
          <span className={styles.senderName}>{message.senderName}</span>
        )}
        {renderContent()}
        <div className={styles.meta}>
          <span className={styles.timestamp}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <span className={styles.status}>{getStatusIcon()}</span>
          )}
        </div>

        {isFailed && onRetry && (
          <button className={styles.retryButton} onClick={() => onRetry(message.id, message.content)}>
            <RotateCcw size={12} />
            Retry
          </button>
        )}
      </div>

      {showActions && message.type === 'text' && (
        <div className={styles.messageActions}>
          {onReply && (
            <button className={styles.messageActionButton} onClick={handleReply}>
              <Reply size={14} />
              Reply
            </button>
          )}
          <button className={styles.messageActionButton} onClick={handleCopy}>
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {onReportMessage && (
            <button className={styles.messageActionButton} onClick={handleReport}>
              <Flag size={14} />
              Report
            </button>
          )}
        </div>
      )}

      {linkConfirmUrl && (
        <div className={styles.linkConfirmOverlay} onClick={() => setLinkConfirmUrl(null)}>
          <div className={styles.linkConfirmDialog} onClick={(e) => e.stopPropagation()}>
            <p className={styles.linkConfirmTitle}>You're leaving the app</p>
            <p className={styles.linkConfirmText}>
              This link may lead to an external website. Only continue if you trust the person who sent it.
            </p>
            <div className={styles.linkConfirmActions}>
              <button className={styles.linkCancelButton} onClick={() => setLinkConfirmUrl(null)}>Cancel</button>
              <button className={styles.linkOpenButton} onClick={() => { window.open(linkConfirmUrl, '_blank', 'noopener,noreferrer'); setLinkConfirmUrl(null); }}>
                Open
              </button>
            </div>
          </div>
        </div>
      )}

      {message.type === 'image' && message.metadata?.imageUrl && (
        <ImagePreviewModal
          open={imagePreviewOpen}
          images={[message.metadata.imageUrl]}
          currentIndex={0}
          onClose={() => setImagePreviewOpen(false)}
          onNext={() => {}}
          onPrev={() => {}}
        />
      )}
    </div>
  );
};
