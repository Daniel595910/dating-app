import React from 'react';
import { Sparkles, Heart, Users } from 'lucide-react';
import { FeedFilter } from '../types/community.types';

interface CommunityEmptyStateProps {
  onCreatePost: () => void;
  filter: FeedFilter;
}

const EMPTY_CONFIGS: Record<FeedFilter, { icon: React.ReactNode; title: string; text: string; showCreateButton: boolean }> = {
  all: {
    icon: <Sparkles size={32} style={{ color: '#f59e0b' }} />,
    title: 'Your community is just getting started',
    text: 'Be the first person to introduce yourself and start a conversation.',
    showCreateButton: true,
  },
  new: {
    icon: <Sparkles size={32} style={{ color: '#f59e0b' }} />,
    title: 'No new posts yet',
    text: 'Check back later or create a post yourself.',
    showCreateButton: true,
  },
  looking: {
    icon: <Heart size={32} style={{ color: '#ef4444' }} />,
    title: 'Nobody is currently looking',
    text: 'No one has posted what they are looking for yet.',
    showCreateButton: true,
  },
  nearby: {
    icon: <Users size={32} style={{ color: '#3b82f6' }} />,
    title: 'No nearby posts',
    text: 'There are no posts from people near you right now.',
    showCreateButton: false,
  },
  following: {
    icon: <Users size={32} style={{ color: '#3b82f6' }} />,
    title: 'No posts from people you follow',
    text: 'Follow more people to see their posts here.',
    showCreateButton: false,
  },
};

export const CommunityEmptyState: React.FC<CommunityEmptyStateProps> = ({ onCreatePost, filter }) => {
  const config = EMPTY_CONFIGS[filter];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '3rem 1.5rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {config.icon}
      </div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
        {config.title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
        {config.text}
      </p>
      {config.showCreateButton && (
        <button
          onClick={onCreatePost}
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 500,
          }}
        >
          Create a Post
        </button>
      )}
    </div>
  );
};
