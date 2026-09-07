import React, { useEffect, useRef } from 'react';
import { User, VolumeX, Ban, Flag, Search, X, Bell, BellOff, ExternalLink } from 'lucide-react';
import styles from '../styles/ChatActionMenu.module.css';

interface ChatActionMenuProps {
  open: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onMute: () => void;
  onBlock: () => void;
  onReport: () => void;
  onSearch?: () => void;
  isMuted?: boolean;
}

export const ChatActionMenu: React.FC<ChatActionMenuProps> = ({
  open,
  onClose,
  onViewProfile,
  onMute,
  onBlock,
  onReport,
  onSearch,
  isMuted = false,
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div ref={menuRef} className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h3 className={styles.title}>Chat Options</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.menuItems}>
          <button className={styles.menuItem} onClick={() => { onViewProfile(); onClose(); }}>
            <span className={styles.menuIcon}><User size={18} /></span>
            <span className={styles.menuLabel}>View Profile</span>
            <ExternalLink size={14} className={styles.menuArrow} />
          </button>

          {onSearch && (
            <button className={styles.menuItem} onClick={() => { onSearch(); onClose(); }}>
              <span className={styles.menuIcon}><Search size={18} /></span>
              <span className={styles.menuLabel}>Search in Conversation</span>
            </button>
          )}

          <button className={styles.menuItem} onClick={() => { onMute(); onClose(); }}>
            <span className={styles.menuIcon}>
              {isMuted ? <Bell size={18} /> : <BellOff size={18} />}
            </span>
            <span className={styles.menuLabel}>
              {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
            </span>
          </button>

          <div className={styles.divider} />

          <button className={`${styles.menuItem} ${styles.dangerItem}`} onClick={() => { onBlock(); onClose(); }}>
            <span className={styles.menuIcon}><Ban size={18} /></span>
            <span className={styles.menuLabel}>Block User</span>
          </button>

          <button className={`${styles.menuItem} ${styles.dangerItem}`} onClick={() => { onReport(); onClose(); }}>
            <span className={styles.menuIcon}><Flag size={18} /></span>
            <span className={styles.menuLabel}>Report User</span>
          </button>
        </div>

        <button className={styles.cancelButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

