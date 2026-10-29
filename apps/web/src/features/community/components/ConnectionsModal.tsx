import React, { useState, useEffect } from 'react';
import { X, Handshake, Heart, Sparkles } from 'lucide-react';
import { ConnectionStatusCard } from './ConnectionStatusCard';
import { RequestsTab } from './RequestsTab';
import { MatchedTab } from './MatchedTab';
import { LikesTab } from './LikesTab';
import styles from '../styles/ConnectionsModal.module.css';

interface OutgoingConnection {
  matchId: string;
  targetUserId: string;
  targetUserName: string;
  targetAvatarUrl?: string | null;
  myInterest: boolean;
  otherInterest: boolean;
}

interface IncomingRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatarUrl?: string | null;
  message?: string;
}

interface ConnectionsModalProps {
  open: boolean;
  onClose: () => void;
  outgoing: OutgoingConnection[];
  incoming: IncomingRequest[];
  matched: OutgoingConnection[];
  likes: OutgoingConnection[];
  onExpressInterest: (matchId: string) => void;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onUnmatch: (matchId: string, otherUserId: string) => Promise<boolean>;
  onLikeBack: (matchId: string) => Promise<boolean>;
  onSkipLike: (matchId: string) => Promise<boolean>;
  onViewProfile: (userId: string) => void;
  onOpenChat: (matchId: string) => void;
  loading: boolean;
}

type Tab = 'connections' | 'matched' | 'likes';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  text: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, text }) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyStateIcon}>{icon}</div>
    <p className={styles.emptyStateTitle}>{title}</p>
    <p className={styles.emptyStateText}>{text}</p>
  </div>
);

export const ConnectionsModal: React.FC<ConnectionsModalProps> = ({
  open,
  onClose,
  outgoing,
  incoming,
  matched,
  likes,
  onExpressInterest,
  onAccept,
  onDecline,
  onUnmatch,
  onLikeBack,
  onSkipLike,
  onViewProfile,
  onOpenChat,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('connections');

  useEffect(() => {
    if (open) {
      if (incoming.length > 0 || outgoing.length > 0) setActiveTab('connections');
      else if (matched.length > 0) setActiveTab('matched');
      else setActiveTab('likes');
    }
  }, [open, incoming.length, outgoing.length, matched.length, likes.length]);

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [open]);

  if (!open) return null;

  const totalCount = outgoing.length + incoming.length + matched.length + likes.length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'connections', label: 'Connections', icon: <Handshake size={16} />, count: incoming.length + outgoing.length },
    { key: 'matched', label: 'Matched', icon: <Sparkles size={16} />, count: matched.length },
    { key: 'likes', label: 'Likes', icon: <Heart size={16} />, count: likes.length },
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Handshake size={22} className={styles.headerIcon} />
            <div className={styles.headerText}>
              <h3 className={styles.headerTitle}>Connections</h3>
              <p className={styles.headerSubtitle}>
                {totalCount === 0 ? 'Nothing pending' : `${totalCount} total`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={styles.closeButton}
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab bar */}
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className={styles.tabBadge}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {activeTab === 'connections' && (
            <>
              {incoming.length > 0 && (
                <RequestsTab
                  requests={incoming}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  onViewProfile={onViewProfile}
                  loading={loading}
                />
              )}
              {outgoing.length > 0 && (
                <>
                  {outgoing.map((conn) => (
                    <ConnectionStatusCard
                      key={conn.matchId}
                      matchId={conn.matchId}
                      targetUserId={conn.targetUserId}
                      targetUserName={conn.targetUserName}
                      targetAvatarUrl={conn.targetAvatarUrl || null}
                      myInterest={conn.myInterest}
                      otherInterest={conn.otherInterest}
                      onExpressInterest={onExpressInterest}
                      onViewProfile={onViewProfile}
                      loading={loading}
                    />
                  ))}
                </>
              )}
              {incoming.length === 0 && outgoing.length === 0 && (
                <EmptyState
                  icon={<Heart size={40} />}
                  title="No connections yet"
                  text="When you express interest and someone does the same, you will see them here."
                />
              )}
            </>
          )}

          {activeTab === 'matched' && (
            <MatchedTab
              matched={matched}
              onUnmatch={onUnmatch}
              onOpenChat={onOpenChat}
              onViewProfile={onViewProfile}
              loading={loading}
            />
          )}

          {activeTab === 'likes' && (
            <LikesTab
              likes={likes}
              onLikeBack={onLikeBack}
              onSkipLike={onSkipLike}
              onViewProfile={onViewProfile}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};