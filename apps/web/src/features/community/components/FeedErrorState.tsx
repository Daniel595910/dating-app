import React from 'react';

interface FeedErrorStateProps {
  onRetry: () => void;
}

export const FeedErrorState: React.FC<FeedErrorStateProps> = ({ onRetry }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '2rem 1rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
      }}>
        ⚠️
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', margin: 0 }}>
        Couldn't load posts
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
        Something went wrong while loading the feed.
      </p>
      <button
        onClick={onRetry}
        style={{
          marginTop: '0.25rem',
          padding: '0.625rem 1.25rem',
          backgroundColor: '#111827',
          color: '#ffffff',
          border: 'none',
          borderRadius: '9999px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        Try Again
      </button>
    </div>
  );
};
