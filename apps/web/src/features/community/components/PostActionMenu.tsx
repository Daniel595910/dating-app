import React, { useEffect, useRef } from 'react';
import { Flag, Ban, VolumeX, Edit, Trash2, Bookmark } from 'lucide-react';

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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    width: '100%',
    padding: '0.625rem 0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#374151',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '0.5rem',
    transition: 'background-color 0.12s ease',
    textAlign: 'left',
    minHeight: 40,
  };

  const dangerItemStyle: React.CSSProperties = {
    ...menuItemStyle,
    color: '#ef4444',
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        right: 0,
        zIndex: 9999,
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e5e7eb',
        minWidth: 220,
        padding: '0.375rem',
      }}
    >
      {isOwnPost ? (
        <>
          {onEdit && (
            <button
              style={menuItemStyle}
              onClick={() => handleAction(onEdit)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Edit size={16} />
              <span>Edit Post</span>
            </button>
          )}
          {onDelete && (
            <button
              style={dangerItemStyle}
              onClick={() => handleAction(onDelete)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Trash2 size={16} />
              <span>Delete Post</span>
            </button>
          )}
        </>
      ) : (
        <>
          {onSave && (
            <button
              style={menuItemStyle}
              onClick={() => handleAction(onSave)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Bookmark size={16} />
              <span>Save Post</span>
            </button>
          )}
          <button
            style={menuItemStyle}
            onClick={() => handleAction(onMute)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <VolumeX size={16} />
            <span>Mute Author</span>
          </button>
          <button
            style={dangerItemStyle}
            onClick={() => handleAction(onBlock)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Ban size={16} />
            <span>Block Author</span>
          </button>
          <button
            style={dangerItemStyle}
            onClick={() => handleAction(onReport)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Flag size={16} />
            <span>Report Post</span>
          </button>
        </>
      )}
    </div>
  );
};
