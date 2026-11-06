import React, { useEffect, useRef, useState } from 'react';
import { X, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './DownloadModal.module.css';

interface DownloadModalProps {
  open: boolean;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  videoId: string | null;
  downloadEnabled: boolean;
  onClose: () => void;
}

type Phase = 'downloading' | 'success' | 'restricted' | 'error';

const MAX_SAFE_BYTES = 200 * 1024 * 1024; // 200 MB memory cap

export const DownloadModal: React.FC<DownloadModalProps> = ({
  open, videoUrl, thumbnailUrl, videoId, downloadEnabled, onClose,
}) => {
  const [phase, setPhase] = useState<Phase>('downloading');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setPhase('downloading');
    setProgress(0);
    setErrorMsg(null);
    abortedRef.current = false;

    if (!downloadEnabled) {
      setPhase('restricted');
      return;
    }
    if (!videoUrl) {
      setPhase('error');
      setErrorMsg('Video URL missing.');
      return;
    }

    const run = async () => {
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error('HTTP ' + response.status);

        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > MAX_SAFE_BYTES) {
          throw new Error('Video too large to download safely (>200MB).');
        }

        if (!response.body) {
          // No streaming support — fall back to direct download
          const blob = await response.blob();
          triggerSave(blob);
          setProgress(100);
          setPhase('success');
          return;
        }

        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        // Simulated progress for unknown content-length (starts at 1, caps at 99)
        let simulated = 1;

        while (true) {
          if (abortedRef.current) {
            reader.cancel();
            return;
          }
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (contentLength > 0) {
              setProgress(Math.min(99, Math.round((received / contentLength) * 100)));
            } else {
              simulated = Math.min(99, simulated + 2);
              setProgress(simulated);
            }
          }
        }

        const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
        triggerSave(blob);
        setProgress(100);
        setPhase('success');
      } catch (err: any) {
        if (abortedRef.current) return;
        console.error('Download failed:', err);
        setErrorMsg(err?.message || 'Download failed.');
        setPhase('error');
      }
    };

    const triggerSave = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'discover-' + (videoId || 'video') + '.mp4';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    run();
    return () => { abortedRef.current = true; };
  }, [open, videoUrl, videoId, downloadEnabled]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className={styles.thumbWrap}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Video thumbnail" className={styles.thumb} />
          ) : (
            <div className={styles.thumbPlaceholder}>
              <Download size={32} />
            </div>
          )}
          {phase === 'downloading' && (
            <div className={styles.progressOverlay}>
              <div className={styles.progressRing}>
                <svg viewBox="0 0 40 40" className={styles.progressSvg}>
                  <circle cx="20" cy="20" r="16" className={styles.progressTrack} />
                  <circle
                    cx="20" cy="20" r="16"
                    className={styles.progressFill}
                    style={{
                      strokeDasharray: `${(progress / 100) * 100.53} 100.53`,
                    }}
                  />
                </svg>
                <span className={styles.progressText}>{progress}%</span>
              </div>
            </div>
          )}
          {phase === 'success' && (
            <div className={styles.progressOverlay}>
              <CheckCircle2 size={48} color="#10b981" />
            </div>
          )}
          {phase === 'restricted' && (
            <div className={styles.progressOverlay}>
              <AlertCircle size={48} color="#f59e0b" />
            </div>
          )}
          {phase === 'error' && (
            <div className={styles.progressOverlay}>
              <AlertCircle size={48} color="#ef4444" />
            </div>
          )}
        </div>

        <div className={styles.body}>
          {phase === 'downloading' && (
            <>
              <h3 className={styles.title}>Downloading…</h3>
              <p className={styles.subtitle}>{progress}% complete</p>
            </>
          )}
          {phase === 'success' && (
            <>
              <h3 className={styles.title}>Download complete</h3>
              <p className={styles.subtitle}>Your video has been saved.</p>
            </>
          )}
          {phase === 'restricted' && (
            <>
              <h3 className={styles.title}>Download restricted</h3>
              <p className={styles.subtitle}>This video cannot be downloaded at this time. The creator has restricted downloads for this video.</p>
            </>
          )}
          {phase === 'error' && (
            <>
              <h3 className={styles.title}>Download failed</h3>
              <p className={styles.subtitle}>{errorMsg || 'Something went wrong.'}</p>
            </>
          )}
        </div>

        <div className={styles.footer}>
          {phase === 'downloading' && (
            <button className={styles.secondaryBtn} onClick={() => { abortedRef.current = true; onClose(); }}>
              Cancel
            </button>
          )}
          {phase !== 'downloading' && (
            <button className={styles.primaryBtn} onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};