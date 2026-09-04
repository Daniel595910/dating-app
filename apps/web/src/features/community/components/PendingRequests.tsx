import React from 'react';
import { Check, X, Heart } from 'lucide-react';
import styles from '../styles/PendingRequests.module.css';

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
    <div className={styles.container}>
      {requests.map((request) => (
        <div key={request.id} className={styles.requestCard}>
          <div className={styles.requestHeader}>
            <div className={styles.requestIcon}>
              <Heart size={18} color="#ef4444" fill="#ef4444" />
            </div>
            <div className={styles.requestInfo}>
              <p className={styles.requestName}>{request.requesterName} wants to get to know you</p>
              {request.message && (
                <p className={styles.requestMessage}>"{request.message}"</p>
              )}
            </div>
          </div>
          <div className={styles.requestActions}>
            <button className={styles.acceptButton} onClick={() => onAccept(request.id)}>
              <Check size={16} />
              Accept
            </button>
            <button className={styles.declineButton} onClick={() => onReject(request.id)}>
              <X size={16} />
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
