import React from 'react';
import { X, UserPlus, Eye } from 'lucide-react';

interface Member {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface MembersModalProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  allowConnections: boolean;
  onViewProfile: (userId: string) => void;
  onGetToKnow: (userId: string) => void;
  loadingUserId?: string | null;
  connectedUserIds?: string[];
}

export const MembersModal: React.FC<MembersModalProps> = ({
  open,
  onClose,
  members,
  allowConnections,
  onViewProfile,
  onGetToKnow,
  loadingUserId,
  connectedUserIds = [],
}) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text, #111827)',
          borderRadius: '1.5rem 1.5rem 0 0',
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem 0.75rem',
            borderBottom: '1px solid var(--color-border, #f3f4f6)',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text, #111827)', margin: 0 }}>
              Community Members
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #6b7280)', margin: '0.125rem 0 0' }}>
              {members.length} member{members.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary, #6b7280)',
              padding: '0.5rem',
              borderRadius: '9999px',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: '1rem',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '0.75rem',
          }}
        >
          {members.length === 0 ? (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-muted, #9ca3af)', padding: '2rem 0' }}>
              No members to show.
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.userId}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '1rem 0.75rem',
                  backgroundColor: 'var(--color-surface, #ffffff)',
                  border: '1px solid var(--color-border, #f3f4f6)',
                  borderRadius: '1rem',
                  gap: '0.5rem',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-surface-alt, #f3f4f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary, #6b7280)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt={m.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    m.name.charAt(0).toUpperCase()
                  )}
                </div>
                <p
                  title={m.name}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-text, #111827)',
                    margin: 0,
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  {m.name}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '0.375rem' }}>
                  <button
                    onClick={() => onViewProfile(m.userId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      padding: '0.5rem',
                      backgroundColor: 'var(--color-surface-alt, #f3f4f6)',
                      color: 'var(--color-text, #111827)',
                      border: 'none',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={12} />
                    View Profile
                  </button>
                  {allowConnections && !connectedUserIds.includes(m.userId) && (
                    <button
                      onClick={() => onGetToKnow(m.userId)}
                      disabled={loadingUserId === m.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        padding: '0.5rem',
                        backgroundColor:
                          loadingUserId === m.userId
                            ? 'var(--color-surface-alt, #f3f4f6)'
                            : 'var(--color-primary, #ef4444)',
                        color:
                          loadingUserId === m.userId
                            ? 'var(--color-text-muted, #9ca3af)'
                            : '#ffffff',
                        border: 'none',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: loadingUserId === m.userId ? 'wait' : 'pointer',
                      }}
                    >
                      <UserPlus size={12} />
                      {loadingUserId === m.userId ? 'Sending...' : 'Get to Know'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};