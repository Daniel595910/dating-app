import React, { useEffect, useRef } from 'react';

interface InfiniteScrollSentinelProps {
  onLoadMore: () => void;
  loading: boolean;
  hasMore: boolean;
}

export const InfiniteScrollSentinel: React.FC<InfiniteScrollSentinelProps> = ({
  onLoadMore,
  loading,
  hasMore,
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore && !loading) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>You're all caught up</p>
      </div>
    );
  }

  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} style={{ padding: '1rem', textAlign: 'center' }}>
      {loading ? (
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading more posts...</span>
      ) : (
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Scroll for more</span>
      )}
    </div>
  );
};
