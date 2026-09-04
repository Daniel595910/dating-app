import React from 'react';
import { ArrowLeft, MoreVertical, BadgeCheck } from 'lucide-react';

interface ChatHeaderProps {
  userName: string;
  userAvatar: string | null;
  verified: boolean;
  isOnline: boolean;
  onBack: () => void;
  onProfileClick: () => void;
  onMoreClick: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  userName,
  userAvatar,
  verified,
  isOnline,
  onBack,
  onProfileClick,
  onMoreClick,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.625rem 0.75rem',
        paddingTop: 'calc(0.625rem + env(safe-area-inset-top))',
        borderBottom: '1px solid #f3f4f6',
        backgroundColor: '#ffffff',
        flexShrink: 0,
      }}
    >
      <button
        onClick={onBack}
        aria-label="Back"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#111827',
          padding: '0.5rem',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
        }}
      >
        <ArrowLeft size={22} />
      </button>

      <button
        onClick={onProfileClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          cursor: 'pointer',
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
        }}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#92400e',
              fontSize: '1rem',
              overflow: 'hidden',
            }}
          >
            {userAvatar ? (
              <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          {isOnline && (
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '2px solid #ffffff',
              }}
            />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName}
            </span>
            {verified && <BadgeCheck size={15} style={{ color: '#3b82f6', flexShrink: 0 }} />}
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#9ca3af', margin: 0 }}>
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </button>

      <button
        onClick={onMoreClick}
        aria-label="More options"
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
        <MoreVertical size={20} />
      </button>
    </header>
  );
};
