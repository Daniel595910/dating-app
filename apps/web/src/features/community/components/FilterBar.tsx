import React from 'react';
import { FeedFilter } from '../../types/community.types';

interface FilterBarProps {
  activeFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
}

const FILTERS: Array<{ id: FeedFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'looking', label: 'Looking' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'following', label: 'Following' },
];

export const FilterBar: React.FC<FilterBarProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '0.25rem',
      padding: '0.5rem 1rem',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #f3f4f6',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      scrollbarWidth: 'none',
    }}>
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            backgroundColor: activeFilter === filter.id ? '#111827' : '#f3f4f6',
            color: activeFilter === filter.id ? '#ffffff' : '#6b7280',
          }}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};
