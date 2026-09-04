import React, { useEffect, useRef } from 'react';

interface PostActionMenuProps {
  open: boolean;
  onClose: () => void;
  isOwnPost: boolean;
  onReport: () => void;
  onBlock: () => void;
  onMute: () => void;
}

export const PostActionMenu: React.FC<PostActionMenuProps> = ({
  open,
  onClose,
  isOwnPost,
  onReport,
  onBlock,
  onMute,
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

  return (
    <>
      {/* Click-away overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'transparent',
        }}
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: 'auto',
          right: '16px',
          zIndex: 9999,
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          border: '1px solid #e5e7eb',
          minWidth: 200,
          padding: '6px',
          marginTop: '8px',
        }}
      >
        {!isOwnPost && (
          <>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                textAlign: 'left',
              }}
              onClick={() => { onMute(); onClose(); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              Mute Author
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                textAlign: 'left',
              }}
              onClick={() => { onBlock(); onClose(); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Block Author
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                textAlign: 'left',
              }}
              onClick={() => { onReport(); onClose(); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              Report Post
            </button>
          </>
        )}
      </div>
    </>
  );
};
