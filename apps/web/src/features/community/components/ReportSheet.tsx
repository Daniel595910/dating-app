import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/ReportSheet.module.css';

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  reporterId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reportedUserId?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake_profile', label: 'Fake Profile' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'scam', label: 'Scam' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'other', label: 'Other' },
];

export const ReportSheet: React.FC<ReportSheetProps> = ({
  open,
  onClose,
  reporterId,
  targetType,
  targetId,
  reportedUserId,
}) => {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('reports').insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId || null,
        type: targetType,
        reason,
        description: description.trim(),
        status: 'pending',
        severity: 'low',
        target_id: targetId,
      });

      if (insertError) throw insertError;

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setReason('');
        setDescription('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Flag size={18} className={styles.flagIcon} />
            <h3 className={styles.title}>Report</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successText}>Report submitted successfully</p>
          </div>
        ) : (
          <>
            <p className={styles.subtitle}>Why are you reporting this?</p>

            <div className={styles.reasonsGrid}>
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  className={`${styles.reasonButton} ${reason === r.value ? styles.reasonButtonActive : ''}`}
                  onClick={() => setReason(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              className={styles.descriptionInput}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details... (optional)"
              rows={3}
              maxLength={1000}
            />

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={submitting || !reason}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
