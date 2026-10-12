import React, { useState, useEffect } from 'react';
import { X, Handshake, Heart, Check } from 'lucide-react';
import { ConnectionStatusCard } from './ConnectionStatusCard';

interface OutgoingConnection {
  matchId: string;
  targetUserId: string;
  targetUserName: string;
  myInterest: boolean;
  otherInterest: boolean;
}

interface IncomingRequest {
  id: string;
  requesterName: string;
  message?: string;
}

interface ConnectionsModalProps {
  open: boolean;
  onClose: () => void;
  outgoing: OutgoingConnection[];
  incoming: IncomingRequest[];
  onExpressInterest: (matchId: string) => void;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  loading: boolean;
}

type Tab = 'outgoing' | 'incoming';

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
  onExpressInterest,
  onAccept,
  onDecline,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('outgoing');

  useEffect(() => {
    if (open) {
      if (outgoing.length === 0 && incoming.length > 0) {
        setActiveTab('incoming');
      } else {
        setActiveTab('outgoing');
      }
    }
  }, [open, outgoing.length, incoming.length]);

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [open]);

  if (!open) return null;

  const totalCount = outgoing.length + incoming.length;

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
              <h3
                style={{
                  fontSize: '1.0625rem',
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Connections
              </h3>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  margin: '0.125rem 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {totalCount === 0
                  ? 'Nothing pending'
                  : `${totalCount} waiting for you`}
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
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #f3f4f6',
            flexShrink: 0,
            background: '#ffffff',
          }}
        >
          <button
            onClick={() => setActiveTab('outgoing')}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: activeTab === 'outgoing' ? '#ef4444' : '#6b7280',
              borderBottom: `2px solid ${activeTab === 'outgoing' ? '#ef4444' : 'transparent'}`,
              transition: 'color 0.15s ease, border-color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              minHeight: 48,
            }}
          >
            <Heart size={16} />
            Getting to Know
            {outgoing.length > 0 && (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: '9999px',
                  background: activeTab === 'outgoing' ? '#ef4444' : '#e5e7eb',
                  color: activeTab === 'outgoing' ? '#ffffff' : '#6b7280',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 6px',
                  lineHeight: 1,
                }}
              >
                {outgoing.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: activeTab === 'incoming' ? '#ef4444' : '#6b7280',
              borderBottom: `2px solid ${activeTab === 'incoming' ? '#ef4444' : 'transparent'}`,
              transition: 'color 0.15s ease, border-color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              minHeight: 48,
            }}
          >
            <Handshake size={16} />
            Requests
            {incoming.length > 0 && (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: '9999px',
                  background: activeTab === 'incoming' ? '#ef4444' : '#e5e7eb',
                  color: activeTab === 'incoming' ? '#ffffff' : '#6b7280',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 6px',
                  lineHeight: 1,
                }}
              >
                {incoming.length}
              </span>
            )}
          </button>
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
          {activeTab === 'outgoing' && (
            <>
              {outgoing.length === 0 ? (
                <EmptyState
                  icon={<Heart size={40} />}
                  title="No connections yet"
                  text="When you express interest and someone does the same, you'll see them here."
                />
              ) : (
                outgoing.map((conn) => (
                  <ConnectionStatusCard
                    key={conn.matchId}
                    matchId={conn.matchId}
                    targetUserName={conn.targetUserName}
                    myInterest={conn.myInterest}
                    otherInterest={conn.otherInterest}
                    onExpressInterest={onExpressInterest}
                    loading={loading}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'incoming' && (
            <>
              {incoming.length === 0 ? (
                <EmptyState
                  icon={<Handshake size={40} />}
                  title="No requests waiting"
                  text="When someone wants to get to know you, their request will appear here."
                />
              ) : (
                incoming.map((request) => (
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
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#fee2e2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Heart size={20} color="#ef4444" fill="#ef4444" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: '#111827',
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          <strong style={{ color: '#ef4444' }}>{request.requesterName}</strong> wants to get to know you
                        </p>
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
                            }}
                          >
                            &ldquo;{request.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => onAccept(request.id)}
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
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <Check size={16} />
                        Accept
                      </button>
                      <button
                        onClick={() => onDecline(request.id)}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          background: 'transparent',
                          color: '#6b7280',
                          border: '1px solid #e5e7eb',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          minHeight: 42,
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <X size={16} />
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
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