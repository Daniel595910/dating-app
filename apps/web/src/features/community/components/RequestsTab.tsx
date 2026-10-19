import React, { useState } from 'react';
import { Handshake, Check, X, MessageSquare } from 'lucide-react';

interface IncomingRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatarUrl?: string | null;
  message?: string;
}

interface RequestsTabProps {
  requests: IncomingRequest[];
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onViewProfile: (userId: string) => void;
  loading: boolean;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({
  requests,
  onAccept,
  onDecline,
  onViewProfile,
  loading,
}) => {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleAccept = (id: string) => {
    setPendingId(id);
    onAccept(id);
  };

  const handleDecline = (id: string) => {
    setPendingId(id);
    onDecline(id);
  };

  if (requests.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
        <Handshake size={40} style={{ opacity: 0.45, marginBottom: '0.75rem' }} />
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6b7280', margin: 0 }}>
          No requests waiting
        </p>
        <p style={{ fontSize: '0.8125rem', margin: '0.375rem 0 0', maxWidth: 260, lineHeight: 1.4, marginLeft: 'auto', marginRight: 'auto' }}>
          When someone wants to get to know you, their request will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {requests.map((request) => (
        <div
          key={request.id}
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
              onClick={() => onViewProfile(request.requesterId)}
              aria-label={`View ${request.requesterName} profile`}
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
              {request.requesterAvatarUrl ? (
                <img
                  src={request.requesterAvatarUrl}
                  alt={request.requesterName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 16 }}>
                  {request.requesterName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                onClick={() => onViewProfile(request.requesterId)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                  lineHeight: 1.3,
                  display: 'block',
                }}
              >
                <strong style={{ color: '#ef4444' }}>{request.requesterName}</strong>
                <span style={{ color: '#6b7280', fontWeight: 400 }}> wants to get to know you</span>
              </button>
              {request.message && (
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#6b7280',
                    margin: '0.25rem 0 0',
                    fontStyle: 'italic',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <MessageSquare size={12} />
                  &ldquo;{request.message}&rdquo;
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleAccept(request.id)}
              disabled={loading || pendingId === request.id}
              style={{
                flex: 1,
                padding: '0.625rem',
                background: loading || pendingId === request.id ? '#fca5a5' : '#ef4444',
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
              <Check size={16} />
              Accept
            </button>
            <button
              onClick={() => handleDecline(request.id)}
              disabled={loading || pendingId === request.id}
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
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
