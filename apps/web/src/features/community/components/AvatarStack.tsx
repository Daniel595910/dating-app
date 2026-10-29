import React from 'react';
import styles from '../styles/AvatarStack.module.css';

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
  ringState?: Record<string, 'unseen' | 'seen'>;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  members,
  totalCount,
  maxVisible = 3,
  onClick,
  ringState = {},
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
      {visible.map((m, i) => {
        const ring = ringState[m.userId];
        const avatar = (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: ring ? 'none' : '2px solid var(--color-surface, #ffffff)',
              marginLeft: i === 0 ? 0 : ring ? -8 : -10,
              backgroundColor: 'var(--color-surface-alt, #f3f4f6)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary, #6b7280)',
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
        );

        if (!ring) {
          return <React.Fragment key={m.userId}>{avatar}</React.Fragment>;
        }

        return (
          <div
            key={m.userId}
            className={`${styles.ring} ${ring === 'unseen' ? styles.ringUnseen : styles.ringSeen}`}
            style={{
              marginLeft: i === 0 ? 0 : -8,
              zIndex: maxVisible - i,
            }}
          >
            <div className={styles.ringInner}>
              {avatar}
            </div>
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          style={{
            minWidth: 28,
            height: 28,
            borderRadius: '9999px',
            border: '2px solid var(--color-surface, #ffffff)',
            marginLeft: -10,
            backgroundColor: 'var(--color-text, #111827)',
            color: 'var(--color-surface, #ffffff)',
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