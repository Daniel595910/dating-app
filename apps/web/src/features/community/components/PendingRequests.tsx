import React from 'react';
import { Check, X, Heart } from 'lucide-react';

interface PendingRequest {
  id: string;
  requesterName: string;
  message?: string;
}

interface PendingRequestsProps {
  requests: PendingRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export const PendingRequests: React.FC<PendingRequestsProps> = ({ requests, onAccept, onReject }) => {
  if (requests.length === 0) return null;

  return (
    <div style={{ marginBottom: '12px' }}>
      {requests.map((request) => (
        <div
          key={request.id}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #fee2e2',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={18} color="#ef4444" fill="#ef4444" />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                {request.requesterName} wants to get to know you
              </p>
              {request.message && (
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                  "{request.message}"
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onAccept(request.id)}
              style={{
                flex: 1,
                padding: '10px',
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
                gap: '6px',
              }}
            >
              <Check size={16} />
              Accept
            </button>
            <button
              onClick={() => onReject(request.id)}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
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
