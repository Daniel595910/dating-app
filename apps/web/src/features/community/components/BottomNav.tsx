import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { id: 'community', label: 'Community', path: '/community', icon: Home },
    { id: 'chats', label: 'Chats', path: '/chats', icon: MessageCircle },
    { id: 'profile', label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom))', zIndex: 40 }}>
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button key={item.id} onClick={() => navigate(item.path)} aria-label={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem', background: 'none', border: 'none', cursor: 'pointer', color: isActive ? '#ef4444' : '#9ca3af', padding: '0.25rem 0.75rem', minWidth: 64 }}>
            <Icon size={24} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
