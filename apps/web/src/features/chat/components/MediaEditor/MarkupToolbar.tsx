import React from 'react';
import { Undo2, Trash2 } from 'lucide-react';
import { Stroke } from '../../utils/mediaEditor';
import styles from './MediaEditor.module.css';

interface MarkupToolbarProps {
  color: string;
  onColorChange: (color: string) => void;
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  disabled?: boolean;
}

const COLORS = [
  { name: 'Red',    value: '#ef4444' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Green',  value: '#10b981' },
  { name: 'Blue',   value: '#3b82f6' },
  { name: 'White',  value: '#ffffff' },
];

export const MarkupToolbar: React.FC<MarkupToolbarProps> = ({
  color,
  onColorChange,
  strokes,
  onStrokesChange,
  disabled = false,
}) => {
  const canUndo = strokes.length > 0 && !disabled;

  const handleUndo = () => {
    if (!canUndo) return;
    onStrokesChange(strokes.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled || strokes.length === 0) return;
    onStrokesChange([]);
  };

  return (
    <div className={styles.markupToolbar}>
      <div className={styles.markupColorRow}>
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`${styles.markupColorBtn} ${color === c.value ? styles.markupColorBtnActive : ''}`}
            style={{ backgroundColor: c.value }}
            onClick={() => onColorChange(c.value)}
            disabled={disabled}
            aria-label={c.name}
            aria-pressed={color === c.value}
          />
        ))}
      </div>
      <div className={styles.markupActionRow}>
        <button
          type="button"
          className={styles.markupIconBtn}
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Undo last stroke"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className={styles.markupIconBtn}
          onClick={handleClear}
          disabled={disabled || strokes.length === 0}
          aria-label="Clear all strokes"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};