import React, { useEffect, useRef } from 'react';
import { User, VolumeX, Ban, Flag, Search } from 'lucide-react';

interface ChatActionMenuProps {
  open: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onMute: () => void;
  onBlock: () => void;
  onReport: () => void;
  onSearch?: () => void;
}

export const ChatActionMenu: React.FC<ChatActionMenuProps> = ({
  open,
  onClose,
  onViewProfile,
  onMute,
  onBlock,
  onReport,
  onSearch,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }} onClick={onClose} />
      <div ref={menuRef} style={{
        position: 'fixed',
        top: '60px',
        right: '16px',
        zIndex: 9999,
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        border: '1px solid #e5e7eb',
        minWidth: 200,
        padding: '6px',
      }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }} onClick={() => { onViewProfile(); onClose(); }}>
          <User size={16} />
          View Profile
        </button>
        {onSearch && (
          <button style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }} onClick={() => { onSearch(); onClose(); }}>
            <Search size={16} />
            Search in Conversation
          </button>
        )}
        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }} onClick={() => { onMute(); onClose(); }}>
          <VolumeX size={16} />
          Mute Notifications
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }} onClick={() => { onBlock(); onClose(); }}>
          <Ban size={16} />
          Block User
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }} onClick={() => { onReport(); onClose(); }}>
          <Flag size={16} />
          Report User
        </button>
      </div>
    </>
  );
};
