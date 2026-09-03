import React from 'react';
import { Search, MoreVertical, Users } from 'lucide-react';
import { CommunityInfo } from '../../types/community.types';

interface CommunityHeaderProps {
  community: CommunityInfo;
  onSearch: () => void;
  onMore: () => void;
}

export const CommunityHeader: React.FC<CommunityHeaderProps> = ({ community, onSearch, onMore }) => {
  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #f3f4f6',
      paddingTop: 'env(safe-area-inset-top)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            {community.flag} {community.name}
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.125rem',
          }}>
            <Users size={12} />
            <span>{community.memberCount.toLocaleString()} members</span>
            <span>•</span>
            <span style={{ color: '#10b981' }}>{community.onlineCount} online</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onSearch} aria-label="Search" style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: '#6b7280', borderRadius: '9999px' }}>
            <Search size={20} />
          </button>
          <button onClick={onMore} aria-label="More options" style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: '#6b7280', borderRadius: '9999px' }}>
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
