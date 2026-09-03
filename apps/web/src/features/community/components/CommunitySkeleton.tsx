import React from 'react';

export const CommunitySkeleton: React.FC = () => {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#faf9f7', maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#f3f4f6', animation: 'pulse 1.5s infinite' }} />
            <div>
              <div style={{ width: 100, height: 14, backgroundColor: '#f3f4f6', borderRadius: '0.25rem', marginBottom: '0.25rem', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: 80, height: 12, backgroundColor: '#f3f4f6', borderRadius: '0.25rem', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>
          <div style={{ width: '100%', height: 14, backgroundColor: '#f3f4f6', borderRadius: '0.25rem', marginBottom: '0.5rem', animation: 'pulse 1.5s infinite' }} />
          <div style={{ width: '70%', height: 14, backgroundColor: '#f3f4f6', borderRadius: '0.25rem', animation: 'pulse 1.5s infinite' }} />
        </div>
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
};
