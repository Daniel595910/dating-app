import React, { useState } from 'react';
import { LayoutGrid, Sparkles, Heart, MapPin, Users, UserRound } from 'lucide-react';
import { FeedFilter } from '../../types/community.types';
import styles from '../styles/FilterBar.module.css';

interface FilterBarProps {
  activeFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
}

interface FilterItem {
  id: FeedFilter;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const FILTER_ITEMS: FilterItem[] = [
  { id: 'all', label: 'All', icon: <LayoutGrid size={14} />, description: 'Show all community posts' },
  { id: 'new', label: 'New', icon: <Sparkles size={14} />, description: 'Posts from last 24 hours' },
  { id: 'looking', label: 'Looking', icon: <Heart size={14} />, description: 'People looking for connections' },
  { id: 'profiles', label: 'Profiles', icon: <UserRound size={14} />, description: 'Swipe through shared profiles' },
  { id: 'nearby', label: 'Nearby', icon: <MapPin size={14} />, description: 'Posts from people near you' },
  { id: 'following', label: 'Following', icon: <Users size={14} />, description: 'Posts from people you follow' },
];

export const FilterBar: React.FC<FilterBarProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <div className={styles.container}>
      <div className={styles.filterBar} role="tablist" aria-label="Community filters">
        {FILTER_ITEMS.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              role="tab"
              aria-selected={isActive}
              aria-label={filter.description}
              title={filter.description}
              className={`${styles.filterButton} ${isActive ? styles.filterButtonActive : ''}`}
              onClick={() => onFilterChange(filter.id)}
            >
              <span className={styles.filterIcon}>{filter.icon}</span>
              <span>{filter.label}</span>
              {isActive && (
                <span className={styles.activeDot} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
