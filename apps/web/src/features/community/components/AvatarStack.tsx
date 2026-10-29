import React from 'react';

interface AvatarStackMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface AvatarStackProps {
  members: AvatarStackMember[];
  totalCount: number;
  maxVisible?: number;
  onClick?: () => void;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  members,
  totalCount,
  maxVisible = 3,
  onClick,
}) => {
  if (!members || members.length === 0) return null;

  const visible = members.slice(0, maxVisible);
  const overflow = Math.max(0, members.length - visible.length);

  return (
    <button
      onClick={onClick}
      aria-label="View members"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
      }}
    >
      {visible.map((m, i) => (
        <div
          key={m.userId}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '2px solid #ffffff',
            marginLeft: i === 0 ? 0 : -10,
            backgroundColor: '#f3f4f6',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: '#6b7280',
            zIndex: maxVisible - i,
            position: 'relative',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
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
      ))}
      {overflow > 0 && (
        <div
          style={{
            minWidth: 28,
            height: 28,
            borderRadius: '9999px',
            border: '2px solid #ffffff',
            marginLeft: -10,
            backgroundColor: '#111827',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.625rem',
            fontWeight: 700,
            padding: '0 0.375rem',
            zIndex: 0,
            position: 'relative',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
        >
          +{overflow}
        </div>
      )}
    </button>
  );
};
