import React, { useState, useEffect } from 'react';
import { X, Handshake, Heart, Sparkles } from 'lucide-react';
import { ConnectionStatusCard } from './ConnectionStatusCard';
import { RequestsTab } from './RequestsTab';
import { MatchedTab } from './MatchedTab';
import { LikesTab } from './LikesTab';

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
  <div
    style={{
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#9ca3af',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    <div style={{ opacity: 0.45, marginBottom: '0.75rem' }}>{icon}</div>
    <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6b7280', margin: 0 }}>
      {title}
    </p>
    <p style={{ fontSize: '0.8125rem', margin: '0.375rem 0 0', maxWidth: 260, lineHeight: 1.4 }}>
      {text}
    </p>
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
      // Default tab: Connections if any, else Matched, else Likes
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        animation: 'fadeInOverlay 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100dvh',
          maxHeight: '100dvh',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUpFullScreen 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
            borderBottom: '1px solid #f3f4f6',
            flexShrink: 0,
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <Handshake size={22} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                Connections
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.125rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {totalCount === 0 ? 'Nothing pending' : `${totalCount} total`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#111827',
              padding: '0.5rem',
              borderRadius: '9999px',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', flexShrink: 0, background: '#ffffff', overflowX: 'auto' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                minWidth: 80,
                padding: '0.75rem 0.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: activeTab === tab.key ? '#ef4444' : '#6b7280',
                borderBottom: `2px solid ${activeTab === tab.key ? '#ef4444' : 'transparent'}`,
                transition: 'color 0.15s ease, border-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                minHeight: 48,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: '9999px',
                    background: activeTab === tab.key ? '#ef4444' : '#e5e7eb',
                    color: activeTab === tab.key ? '#ffffff' : '#6b7280',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                    lineHeight: 1,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
            background: '#faf9f7',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {activeTab === 'connections' && (
            <>
              {incoming.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#6b7280', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Requests
                  </h4>
                  <RequestsTab
                    requests={incoming}
                    onAccept={onAccept}
                    onDecline={onDecline}
                    onViewProfile={onViewProfile}
                    loading={loading}
                  />
                </div>
              )}
              {outgoing.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#6b7280', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Getting to Know
                  </h4>
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
                </div>
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

        <style>{`
          @keyframes fadeInOverlay {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes slideUpFullScreen {
            from { transform: translateY(30px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};
