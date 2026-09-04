import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, X, AlertTriangle } from 'lucide-react';
import styles from '../styles/VoiceRecorder.module.css';

interface VoiceRecorderProps {
  open: boolean;
  onClose: () => void;
  onSend: (audioBlob: Blob, duration: number) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  open,
  onClose,
  onSend,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const MAX_DURATION = 120;

  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Get supported MIME type across browsers
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/aac',
    ];

    for (const type of types) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      } catch {
        // Continue to next type
      }
    }
    return '';
  };

  const startRecording = async () => {
    setError(null);
    chunksRef.current = [];
    setRecordingTime(0);

    // Check for microphone support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone access requires HTTPS or localhost. Please use https:// or localhost to record voice messages.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stopTimer();
      };

      mediaRecorder.onerror = () => {
        setError('Recording failed. Please try again.');
        setIsRecording(false);
        stopTimer();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Voice recording error:', err);
      setIsRecording(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Tap the lock icon in your browser address bar and allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (err.name === 'NotReadableError') {
        setError('Microphone is already in use by another application.');
      } else if (err.name === 'SecurityError') {
        setError('Microphone access requires HTTPS or localhost.');
      } else {
        setError('Could not access microphone. Please check your browser settings and try again.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
      setIsRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleDelete = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const handleSend = () => {
    if (audioUrl && chunksRef.current.length > 0) {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      onSend(blob, recordingTime);
      handleDelete();
      onClose();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h3 className={styles.title}>
            {isRecording ? 'Recording...' : audioUrl ? 'Preview' : 'Voice Message'}
          </h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {error ? (
            <div className={styles.errorState}>
              <AlertTriangle size={28} className={styles.errorIcon} />
              <p className={styles.error}>{error}</p>
              <button className={styles.retryButton} onClick={() => setError(null)}>
                Try Again
              </button>
            </div>
          ) : isRecording ? (
            <div className={styles.recordingState}>
              <div className={styles.recordingIndicator}>
                <span className={styles.recordingDot} />
              </div>
              <p className={styles.recordingTime}>{formatTime(recordingTime)}</p>
              <div className={styles.waveform}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                  <span
                    key={i}
                    className={styles.waveformBar}
                    style={{
                      height: `${Math.random() * 30 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : audioUrl ? (
            <div className={styles.previewState}>
              <audio src={audioUrl} controls className={styles.audioPlayer} />
              <p className={styles.previewTime}>Duration: {formatTime(recordingTime)}</p>
            </div>
          ) : (
            <div className={styles.idleState}>
              <div className={styles.micIcon}>
                <Mic size={32} />
              </div>
              <p className={styles.idleText}>Tap record to start a voice message</p>
              <p className={styles.maxDuration}>Maximum: {formatTime(MAX_DURATION)}</p>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {!isRecording && !audioUrl && !error && (
            <button className={styles.recordButton} onClick={startRecording}>
              <Mic size={18} />
              Start Recording
            </button>
          )}

          {isRecording && (
            <button className={styles.stopButton} onClick={stopRecording}>
              <Square size={18} />
              Stop
            </button>
          )}

          {audioUrl && (
            <>
              <button className={styles.deleteButton} onClick={handleDelete}>
                <Trash2 size={18} />
                Delete
              </button>
              <button className={styles.sendButton} onClick={handleSend}>
                <Send size={18} />
                Send
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

