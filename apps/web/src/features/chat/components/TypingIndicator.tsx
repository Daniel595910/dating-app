import React from 'react';

interface TypingIndicatorProps {
  userName: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem' }}>
      <div style={{ display: 'flex', gap: '3px' }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#9ca3af',
            animation: 'typingBounce 1.4s infinite',
          }}
        />
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#9ca3af',
            animation: 'typingBounce 1.4s infinite 0.2s',
          }}
        />
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#9ca3af',
            animation: 'typingBounce 1.4s infinite 0.4s',
          }}
        />
      </div>
      <span style={{ fontSize: '0.6875rem', color: '#9ca3af', fontStyle: 'italic' }}>
        {userName} is typing...
      </span>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};
