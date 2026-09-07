import React, { useState } from 'react';
import { X, Image, Timer, Trash2 } from 'lucide-react';
import styles from '../styles/ChatSettingsSheet.module.css';

interface ChatSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onSetWallpaper: (color: string) => void;
  onClearWallpaper: () => void;
  onSetDisappearing: (enabled: boolean, durationHours: number) => void;
  currentWallpaper: string | null;
  disappearingEnabled: boolean;
  disappearingDuration: number;
}

const WALLPAPER_COLORS = [
  '#f0f2f5', '#e8f5e9', '#fff3e0', '#fce4ec', '#e3f2fd',
  '#f3e5f5', '#e0f2f1', '#fff8e1', '#fbe9e7', '#eceff1',
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
  currentWallpaper,
  disappearingEnabled,
  disappearingDuration,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

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
          {/* Wallpaper */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Image size={16} /> Chat Wallpaper
            </h3>
            <div className={styles.wallpaperGrid}>
              {WALLPAPER_COLORS.map((color) => (
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
        </div>
      </div>
    </div>
  );
};
