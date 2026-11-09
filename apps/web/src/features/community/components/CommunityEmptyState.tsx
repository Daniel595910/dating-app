import React from 'react';
import { Sparkles, Heart, Users, MapPin } from 'lucide-react';
import { FeedFilter } from '../types/community.types';
import styles from '../styles/CommunityEmptyState.module.css';

interface CommunityEmptyStateProps {
  onCreatePost: () => void;
  filter: FeedFilter;
}

const EMPTY_CONFIGS: Record<string, { icon: React.ReactNode; title: string; text: string; showCreateButton: boolean }> = {
  all: {
    icon: <Sparkles size={32} />,
    title: 'Your community is just getting started',
    text: 'Be the first person to introduce yourself and start a conversation.',
    showCreateButton: true,
  },
  new: {
    icon: <Sparkles size={32} />,
    title: 'No new posts yet',
    text: 'Check back later or create a post yourself to get things going.',
    showCreateButton: true,
  },
  looking: {
    icon: <Heart size={32} />,
    title: 'Nobody is currently looking',
    text: 'No one has posted what they are looking for yet. Check back soon.',
    showCreateButton: true,
  },
  profiles: {
    icon: <Users size={32} />,
    title: 'No profiles yet',
    text: 'Nobody has shared their profile in this community yet.',
    showCreateButton: false,
  },
  nearby: {
    icon: <MapPin size={32} />,
    title: 'No posts nearby',
    text: 'There are no posts from people near you right now. Try expanding your location settings.',
    showCreateButton: false,
  },
  following: {
    icon: <Users size={32} />,
    title: 'No posts from people you follow',
    text: 'Follow more people in the community to see their posts here.',
    showCreateButton: false,
  },
};

export const CommunityEmptyState: React.FC<CommunityEmptyStateProps> = ({ onCreatePost, filter }) => {
  const config = EMPTY_CONFIGS[filter] || EMPTY_CONFIGS.all;

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        {config.icon}
      </div>
      <h3 className={styles.title}>{config.title}</h3>
      <p className={styles.text}>{config.text}</p>
      
      {config.showCreateButton && (
        <button onClick={onCreatePost} className={styles.createButton}>
          Create a Post
        </button>
      )}
    </div>
  );
};