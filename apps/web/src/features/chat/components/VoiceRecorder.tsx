import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, X } from 'lucide-react';
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

  const MAX_DURATION = 120; // 2 minutes

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

  const startRecording = async () => {
    setError(null);
    chunksRef.current = [];
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stopTimer();
      };

      mediaRecorder.start();
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
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please enable in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found.');
      } else {
        setError('Failed to start recording.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
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
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
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
            <p className={styles.error}>{error}</p>
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
          {!isRecording && !audioUrl && (
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
