import React, { useEffect, useState } from 'react';
import { X, Send, Timer } from 'lucide-react';
import { CaptionInput } from './CaptionInput';
import styles from './MediaEditor.module.css';

export interface MediaEditorResult {
  file: File;
  quality: 'hd' | 'sd';
  caption: string;
}

interface MediaEditorProps {
  file: File;
  initialQuality: 'hd' | 'sd';
  onCancel: () => void;
  onConfirm: (opts: MediaEditorResult) => void;
}

export const MediaEditor: React.FC<MediaEditorProps> = ({
  file,
  initialQuality,
  onCancel,
  onConfirm,
}) => {
  const [caption, setCaption] = useState('');
  const [quality, setQuality] = useState<'hd' | 'sd'>(initialQuality);
  const [sending, setSending] = useState(false);

  const isVideo = file.type.startsWith('video/');
  const [objectUrl, setObjectUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, sending]);

  const handleConfirm = () => {
    if (sending) return;
    setSending(true);
    onConfirm({ file, quality, caption: caption.trim() });
  };

  return (
    <div className={styles.overlay} onClick={() => { if (!sending) onCancel(); }}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => { if (!sending) onCancel(); }}
            aria-label="Cancel"
          >
            <X size={20} />
          </button>
          <span className={styles.headerTitle}>Send Media</span>
          <button
            type="button"
            className={styles.sendBtn}
            onClick={handleConfirm}
            disabled={sending}
            aria-label="Send"
          >
            {sending ? 'Sending...' : <><Send size={16} /><span>Send</span></>}
          </button>
        </div>

        <div className={styles.previewArea}>
          {isVideo ? (
            <video
              src={objectUrl}
              className={styles.media}
              controls
              playsInline
              autoPlay
              muted
            />
          ) : (
            <img src={objectUrl} alt="Preview" className={styles.media} />
          )}
        </div>

        <div className={styles.footer}>
          <CaptionInput
            value={caption}
            onChange={setCaption}
            disabled={sending}
          />

          <div className={styles.controlsRow}>
            <div className={styles.qualityToggle} role="group" aria-label="Quality">
              <button
                type="button"
                className={`${styles.qualityOption} ${quality === 'sd' ? styles.qualityOptionActive : ''}`}
                onClick={() => setQuality('sd')}
                aria-pressed={quality === 'sd'}
                disabled={sending}
              >
                SD
              </button>
              <button
                type="button"
                className={`${styles.qualityOption} ${quality === 'hd' ? styles.qualityOptionActive : ''}`}
                onClick={() => setQuality('hd')}
                aria-pressed={quality === 'hd'}
                disabled={sending}
              >
                HD
              </button>
            </div>

            <div className={styles.disappearHint} title="Disappearing is controlled by chat settings">
              <Timer size={14} />
              <span>Auto-delete follows chat setting</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
