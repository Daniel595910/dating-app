import React, { useState } from 'react';
import { Handshake, Check, X, MessageSquare } from 'lucide-react';
import styles from '../styles/RequestsTab.module.css';

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
      <div className={styles.empty}>
        <Handshake size={40} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No requests waiting</p>
        <p className={styles.emptyText}>
          When someone wants to get to know you, their request will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {requests.map((request) => (
        <div key={request.id} className={styles.card}>
          <div className={styles.row}>
            <button
              onClick={() => onViewProfile(request.requesterId)}
              aria-label={`View ${request.requesterName} profile`}
              className={styles.avatarButton}
            >
              {request.requesterAvatarUrl ? (
                <img
                  src={request.requesterAvatarUrl}
                  alt={request.requesterName}
                  className={styles.avatarImg}
                />
              ) : (
                <span className={styles.avatarInitial}>
                  {request.requesterName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <div className={styles.info}>
              <button
                onClick={() => onViewProfile(request.requesterId)}
                className={styles.nameButton}
              >
                <strong className={styles.nameStrong}>{request.requesterName}</strong>
                <span className={styles.nameSuffix}> wants to get to know you</span>
              </button>
              {request.message && (
                <p className={styles.message}>
                  <MessageSquare size={12} />
                  &ldquo;{request.message}&rdquo;
                </p>
              )}
            </div>
          </div>
          <div className={styles.actions}>
            <button
              onClick={() => handleAccept(request.id)}
              disabled={loading || pendingId === request.id}
              className={styles.btnPrimary}
            >
              <Check size={16} />
              Accept
            </button>
            <button
              onClick={() => handleDecline(request.id)}
              disabled={loading || pendingId === request.id}
              className={styles.btnSecondary}
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