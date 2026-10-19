import React, { useState } from 'react';
import { Heart, MessageCircle, X } from 'lucide-react';

interface MatchedConnection {
  matchId: string;
  targetUserId: string;
  targetUserName: string;
  targetAvatarUrl?: string | null;
  myInterest: boolean;
  otherInterest: boolean;
}

interface MatchedTabProps {
  matched: MatchedConnection[];
  onUnmatch: (matchId: string, otherUserId: string) => Promise<boolean>;
  onOpenChat: (matchId: string) => void;
  onViewProfile: (userId: string) => void;
  loading: boolean;
}

export const MatchedTab: React.FC<MatchedTabProps> = ({
  matched,
  onUnmatch,
  onOpenChat,
  onViewProfile,
  loading,
}) => {
  const [unmatchTarget, setUnmatchTarget] = useState<MatchedConnection | null>(null);
  const [unmatching, setUnmatching] = useState(false);

  const handleConfirmUnmatch = async () => {
    if (!unmatchTarget) return;
    setUnmatching(true);
    try {
      await onUnmatch(unmatchTarget.matchId, unmatchTarget.targetUserId);
      setUnmatchTarget(null);
    } finally {
      setUnmatching(false);
    }
  };

  if (matched.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
        <Heart size={40} style={{ opacity: 0.45, marginBottom: '0.75rem' }} />
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6b7280', margin: 0 }}>
          No matches yet
        </p>
        <p style={{ fontSize: '0.8125rem', margin: '0.375rem 0 0', maxWidth: 260, lineHeight: 1.4, marginLeft: 'auto', marginRight: 'auto' }}>
          When you and someone both express interest, you will match here and can start chatting.
        </p>
      </div>
    );
  }

  return (
    <div>
      {matched.map((connection) => (
        <div
          key={connection.matchId}
          style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #fecaca',
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
                💕 Matched
              </span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onOpenChat(connection.matchId)}
              style={{
                flex: 1,
                padding: '0.625rem',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                minHeight: 42,
              }}
            >
              <MessageCircle size={16} />
              Chat
            </button>
            <button
              onClick={() => setUnmatchTarget(connection)}
              disabled={loading}
              style={{
                padding: '0.625rem 0.875rem',
                background: 'transparent',
                color: '#dc2626',
                border: '1px solid #fca5a5',
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
              Unmatch
            </button>
          </div>
        </div>
      ))}

      {unmatchTarget && (
        <div
          onClick={() => !unmatching && setUnmatchTarget(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '1rem',
              padding: '1.5rem',
              maxWidth: 400,
              width: '100%',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
              Unmatch?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              You are about to unmatch <strong style={{ color: '#111827' }}>{unmatchTarget.targetUserName}</strong>.
              The conversation will be closed for both of you.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setUnmatchTarget(null)}
                disabled={unmatching}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '9999px',
                  cursor: unmatching ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnmatch}
                disabled={unmatching}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: unmatching ? '#fca5a5' : '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: unmatching ? 'wait' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {unmatching ? 'Unmatching…' : 'Unmatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
