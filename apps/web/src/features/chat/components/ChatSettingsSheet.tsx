import React, { useState } from 'react';
import { X, Image, Timer, Trash2, UserX, Flag, Bell, User, Sparkles } from 'lucide-react';
import styles from '../styles/ChatSettingsSheet.module.css';

interface ChatSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onSetWallpaper: (color: string) => void;
  onClearWallpaper: () => void;
  onSetDisappearing: (enabled: boolean, durationHours: number) => void;
  onSetTheme: (theme: 'light' | 'dark') => void;
  onBlockUser?: () => void;
  onReportUser?: () => void;
  onViewProfile?: () => void;
  currentWallpaper: string | null;
  currentTheme?: 'light' | 'dark';
  disappearingEnabled: boolean;
  disappearingDuration: number;
}

const WALLPAPER_COLORS_LIGHT = [
  '#f0f2f5', '#e8f5e9', '#fff3e0', '#fce4ec', '#e3f2fd',
  '#f3e5f5', '#e0f2f1', '#fff8e1', '#fbe9e7', '#eceff1',
];

const WALLPAPER_COLORS_DARK = [
  '#0f172a', '#1e293b', '#334155', '#111827', '#1f2937',
  '#2d3748', '#1a202c', '#0c4a6e', '#312e81', '#3f3f46',
];

const DURATION_OPTIONS = [
  { label: '24 Hours', value: 24 },
  { label: '7 Days', value: 168 },
  { label: '30 Days', value: 720 },
];

export const ChatSettingsSheet: React.FC<ChatSettingsSheetProps> = ({
  open,
  onClose,
  onSetWallpaper,
  onClearWallpaper,
  onSetDisappearing,
  onSetTheme,
  onBlockUser,
  onReportUser,
  onViewProfile,
  currentWallpaper,
  currentTheme = 'light',
  disappearingEnabled,
  disappearingDuration,
}) => {
  const [muted, setMuted] = useState(false);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
          <h2 className={styles.title}>Chat Settings</h2>
          <div style={{ width: 36 }} />
        </div>

        <div className={styles.content}>
          {/* Quick Actions */}
          {onViewProfile && (
            <button className={styles.quickAction} onClick={onViewProfile}>
              <User size={18} />
              <span>View Profile</span>
            </button>
          )}

          {/* Mute Notifications */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Bell size={16} /> Notifications
            </h3>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Mute notifications</span>
              <button
                className={`${styles.toggle} ${muted ? styles.toggleActive : ''}`}
                onClick={() => setMuted(!muted)}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Sparkles size={16} /> Theme
            </h3>
            <div className={styles.durationOptions}>
              <button
                className={`${styles.durationOption} ${currentTheme === 'light' ? styles.durationOptionActive : ''}`}
                onClick={() => onSetTheme('light')}
              >
                Light
              </button>
              <button
                className={`${styles.durationOption} ${currentTheme === 'dark' ? styles.durationOptionActive : ''}`}
                onClick={() => onSetTheme('dark')}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Wallpaper */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Image size={16} /> Chat Wallpaper
            </h3>
            <p className={styles.wallpaperGroupLabel}>Light</p>
            <div className={styles.wallpaperGrid}>
              {WALLPAPER_COLORS_LIGHT.map((color) => (
                <button
                  key={color}
                  className={`${styles.colorOption} ${currentWallpaper === color ? styles.colorOptionActive : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onSetWallpaper(color)}
                />
              ))}
            </div>
            <p className={styles.wallpaperGroupLabel}>Dark</p>
            <div className={styles.wallpaperGrid}>
              {WALLPAPER_COLORS_DARK.map((color) => (
                <button
                  key={color}
                  className={`${styles.colorOption} ${currentWallpaper === color ? styles.colorOptionActive : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onSetWallpaper(color)}
                />
              ))}
            </div>
            {currentWallpaper && (
              <button className={styles.clearButton} onClick={onClearWallpaper}>
                <Trash2 size={14} /> Clear Wallpaper
              </button>
            )}
          </div>

          {/* Disappearing Messages */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Timer size={16} /> Disappearing Messages
            </h3>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Enable disappearing messages</span>
              <button
                className={`${styles.toggle} ${disappearingEnabled ? styles.toggleActive : ''}`}
                onClick={() => onSetDisappearing(!disappearingEnabled, disappearingDuration)}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
            {disappearingEnabled && (
              <div className={styles.durationOptions}>
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`${styles.durationOption} ${disappearingDuration === opt.value ? styles.durationOptionActive : ''}`}
                    onClick={() => onSetDisappearing(true, opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Safety */}
          {(onBlockUser || onReportUser) && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Flag size={16} /> Safety
              </h3>
              {onBlockUser && (
                <button className={styles.dangerButton} onClick={onBlockUser}>
                  <UserX size={16} /> Block User
                </button>
              )}
              {onReportUser && (
                <button className={styles.reportButton} onClick={onReportUser}>
                  <Flag size={16} /> Report User
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
