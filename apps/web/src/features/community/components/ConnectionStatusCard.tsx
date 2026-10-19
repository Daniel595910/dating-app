import React from 'react';
import { Heart, Handshake, Crown, Check, CheckCheck } from 'lucide-react';

interface ConnectionStatusCardProps {
  matchId: string;
  targetUserName: string;
  targetUserId: string;
  targetAvatarUrl: string | null;
  onViewProfile: (userId: string) => void;
  myInterest: boolean;
  otherInterest: boolean;
  onExpressInterest: (matchId: string) => void;
  loading: boolean;
}

export const ConnectionStatusCard: React.FC<ConnectionStatusCardProps> = ({
  targetUserId,
  targetAvatarUrl,
  onViewProfile,
  matchId,
  targetUserName,
  myInterest,
  otherInterest,
  onExpressInterest,
  loading,
}) => {
  const isMutual = myInterest && otherInterest;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: isMutual ? '1px solid #fecaca' : '1px solid #f3f4f6',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <button
          onClick={() => onViewProfile(targetUserId)}
          aria-label={`View ${targetUserName} profile`}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
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
          {targetAvatarUrl ? (
            <img src={targetAvatarUrl} alt={targetUserName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 15 }}>
              {targetUserName.charAt(0).toUpperCase()}
            </span>
          )}
        </button>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>
            Getting to Know {targetUserName}
          </h3>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
            {isMutual
              ? 'You both expressed interest! 🎉'
              : myInterest
                ? "You've expressed interest. Waiting for their response..."
                : otherInterest
                  ? 'They expressed interest in you!'
                  : 'Express interest to continue the connection.'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: '9999px',
            backgroundColor: '#ef4444',
          }}
        />
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: '9999px',
            backgroundColor: myInterest ? '#ef4444' : '#f3f4f6',
          }}
        />
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: '9999px',
            backgroundColor: isMutual ? '#ef4444' : '#f3f4f6',
          }}
        />
      </div>

      {/* Actions */}
      {!myInterest && !isMutual && (
        <button
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: 44,
          }}
          onClick={() => onExpressInterest(matchId)}
          disabled={loading}
        >
          <Handshake size={16} />
          {loading ? 'Sending...' : "I'm Interested"}
        </button>
      )}

      {myInterest && !otherInterest && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#fef3c7',
            borderRadius: '9999px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 500,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Check size={14} />
          Interest sent! Waiting for {targetUserName}...
        </div>
      )}

      {isMutual && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#d1fae5',
            borderRadius: '9999px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 600,
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Crown size={14} />
          Mutual interest! You've matched! 🎉
        </div>
      )}
    </div>
  );
};
