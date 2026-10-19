import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';

interface LikedConnection {
  matchId: string;
  targetUserId: string;
  targetUserName: string;
  targetAvatarUrl?: string | null;
  myInterest: boolean;
  otherInterest: boolean;
}

interface LikesTabProps {
  likes: LikedConnection[];
  onLikeBack: (matchId: string) => Promise<boolean>;
  onSkipLike: (matchId: string) => Promise<boolean>;
  onViewProfile: (userId: string) => void;
  loading: boolean;
}

export const LikesTab: React.FC<LikesTabProps> = ({
  likes,
  onLikeBack,
  onSkipLike,
  onViewProfile,
  loading,
}) => {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleLikeBack = async (matchId: string) => {
    setPendingId(matchId);
    try {
      await onLikeBack(matchId);
    } finally {
      setPendingId(null);
    }
  };

  const handleSkip = async (matchId: string) => {
    setPendingId(matchId);
    try {
      await onSkipLike(matchId);
    } finally {
      setPendingId(null);
    }
  };

  if (likes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
        <Heart size={40} style={{ opacity: 0.45, marginBottom: '0.75rem' }} />
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6b7280', margin: 0 }}>
          No likes yet
        </p>
        <p style={{ fontSize: '0.8125rem', margin: '0.375rem 0 0', maxWidth: 260, lineHeight: 1.4, marginLeft: 'auto', marginRight: 'auto' }}>
          When someone expresses interest in you, they will appear here so you can decide if you want to like back.
        </p>
      </div>
    );
  }

  return (
    <div>
      {likes.map((connection) => {
        const isPending = pendingId === connection.matchId;
        return (
          <div
            key={connection.matchId}
            style={{
              background: '#ffffff',
              borderRadius: '1rem',
              padding: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #fee2e2',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <button
                onClick={() => onViewProfile(connection.targetUserId)}
                aria-label={`View ${connection.targetUserName} profile`}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {connection.targetAvatarUrl ? (
                  <img
                    src={connection.targetAvatarUrl}
                    alt={connection.targetUserName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 16 }}>
                    {connection.targetUserName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              <button
                onClick={() => onViewProfile(connection.targetUserId)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    color: '#111827',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {connection.targetUserName}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginTop: '0.125rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                  }}
                >
                  ❤️ Liked you
                </span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleLikeBack(connection.matchId)}
                disabled={loading || isPending}
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  background: loading || isPending ? '#fca5a5' : '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  minHeight: 42,
                }}
              >
                <Heart size={16} />
                {isPending ? 'Liking…' : 'Like Back'}
              </button>
              <button
                onClick={() => handleSkip(connection.matchId)}
                disabled={loading || isPending}
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '9999px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  minHeight: 42,
                }}
              >
                <X size={16} />
                Skip
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
