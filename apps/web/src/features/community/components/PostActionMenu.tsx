import React from 'react';
import { X, Flag, Ban, VolumeX, Edit, Trash2, Bookmark } from 'lucide-react';
import styles from '../styles/PostActionMenu.module.css';

interface PostActionMenuProps {
  open: boolean;
  onClose: () => void;
  isOwnPost: boolean;
  onReport: () => void;
  onBlock: () => void;
  onMute: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
}

export const PostActionMenu: React.FC<PostActionMenuProps> = ({
  open,
  onClose,
  isOwnPost,
  onReport,
  onBlock,
  onMute,
  onEdit,
  onDelete,
  onSave,
}) => {
  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.5rem 1.5rem 0 0',
          width: '100%',
          maxWidth: '480px',
          margin: '0 auto',
          padding: '0.5rem 1rem calc(1rem + env(safe-area-inset-bottom))',
          maxHeight: '50dvh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            backgroundColor: '#e5e7eb',
            borderRadius: '9999px',
            margin: '0 auto 0.75rem',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            Options
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.5rem',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {isOwnPost ? (
            <>
              {onEdit && (
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#374151',
                    fontSize: '0.9375rem',
                    borderRadius: '0.5rem',
                    minHeight: 48,
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onClick={onEdit}
                >
                  <Edit size={18} />
                  <span>Edit Post</span>
                </button>
              )}
              {onDelete && (
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontSize: '0.9375rem',
                    borderRadius: '0.5rem',
                    minHeight: 48,
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onClick={onDelete}
                >
                  <Trash2 size={18} />
                  <span>Delete Post</span>
                </button>
              )}
            </>
          ) : (
            <>
              {onSave && (
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#374151',
                    fontSize: '0.9375rem',
                    borderRadius: '0.5rem',
                    minHeight: 48,
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onClick={onSave}
                >
                  <Bookmark size={18} />
                  <span>Save Post</span>
                </button>
              )}
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 0.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#374151',
                  fontSize: '0.9375rem',
                  borderRadius: '0.5rem',
                  minHeight: 48,
                  width: '100%',
                  textAlign: 'left',
                }}
                onClick={onMute}
              >
                <VolumeX size={18} />
                <span>Mute Author</span>
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 0.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '0.9375rem',
                  borderRadius: '0.5rem',
                  minHeight: 48,
                  width: '100%',
                  textAlign: 'left',
                }}
                onClick={onBlock}
              >
                <Ban size={18} />
                <span>Block Author</span>
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 0.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '0.9375rem',
                  borderRadius: '0.5rem',
                  minHeight: 48,
                  width: '100%',
                  textAlign: 'left',
                }}
                onClick={onReport}
              >
                <Flag size={18} />
                <span>Report Post</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
