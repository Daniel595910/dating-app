import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireTyping?: string; // If set, user must type this to confirm
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  requireTyping,
  loading = false,
}) => {
  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) {
      setTyped('');
      setConfirming(false);
    }
  }, [open]);

  const canConfirm = !requireTyping || typed === requireTyping;

  const handleConfirm = async () => {
    if (!canConfirm || confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const icon = variant === 'danger' ? <Trash2 size={24} /> : variant === 'warning' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className={styles.content}>
        <div className={`${styles.iconWrapper} ${styles[variant]}`}>
          {icon}
        </div>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}

        {requireTyping && (
          <div className={styles.confirmInput}>
            <label className={styles.confirmLabel}>
              Type <strong>{requireTyping}</strong> to confirm
            </label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTyping}
              autoFocus
            />
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose} disabled={confirming || loading}>
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          disabled={!canConfirm}
          loading={confirming || loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};
