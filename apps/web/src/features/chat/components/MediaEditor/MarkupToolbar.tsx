import React from 'react';
import { Undo2, Trash2, Highlighter, PenTool, Edit3 } from 'lucide-react';
import { Stroke, BrushType } from '../../utils/mediaEditor';
import styles from './MediaEditor.module.css';

interface MarkupToolbarProps {
  color: string;
  onColorChange: (color: string) => void;
  brushType: BrushType;
  onBrushTypeChange: (type: BrushType) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  onDone: () => void;
  disabled?: boolean;
}

export const MarkupToolbar: React.FC<MarkupToolbarProps> = ({
  color,
  onColorChange,
  brushType,
  onBrushTypeChange,
  brushSize,
  onBrushSizeChange,
  strokes,
  onStrokesChange,
  onDone,
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
    <div className={styles.markupStudio}>
      {/* Top Bar - Done on the RIGHT, actions on the LEFT */}
      <div className={styles.markupTopBar}>
        <div className={styles.markupTopActions}>
          <button className={styles.markupIconBtn} onClick={handleUndo} disabled={!canUndo} title="Undo">
            <Undo2 size={22} />
          </button>
          <button className={styles.markupIconBtn} onClick={handleClear} disabled={disabled || strokes.length === 0} title="Clear all">
            <Trash2 size={22} />
          </button>
        </div>
        <button className={styles.markupDoneBtn} onClick={onDone} disabled={disabled}>
          Done
        </button>
      </div>

      {/* Right Side: Size Slider */}
      <div className={styles.markupSideSlider}>
        <input
          type="range"
          min="2"
          max="30"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className={styles.verticalRange}
          disabled={disabled}
        />
        <div 
          className={styles.brushPreviewDot}
          style={{ 
            width: Math.min(brushSize, 24), 
            height: Math.min(brushSize, 24), 
            backgroundColor: color, 
            opacity: brushType === 'highlighter' ? 0.4 : 1,
            borderRadius: brushType === 'marker' ? '4px' : '50%'
          }} 
        />
      </div>

      {/* Bottom Tool Palette */}
      <div className={styles.markupBottomBar}>
        <div className={styles.markupPalettePill}>
          {/* Color Picker */}
          <label className={styles.markupColorWrapper}>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className={styles.markupColorInput}
              disabled={disabled}
            />
            <div className={styles.markupColorRing} />
          </label>

          <div className={styles.markupPaletteDivider} />

          {/* Tools */}
          <button
            className={`${styles.markupToolBtn} ${brushType === 'pen' ? styles.markupToolBtnActive : ''}`}
            onClick={() => onBrushTypeChange('pen')}
            disabled={disabled}
            title="Pen"
          >
            <PenTool size={24} />
          </button>
          
          <button
            className={`${styles.markupToolBtn} ${brushType === 'marker' ? styles.markupToolBtnActive : ''}`}
            onClick={() => onBrushTypeChange('marker')}
            disabled={disabled}
            title="Marker"
          >
            <Edit3 size={24} />
          </button>
          
          <button
            className={`${styles.markupToolBtn} ${brushType === 'highlighter' ? styles.markupToolBtnActive : ''}`}
            onClick={() => onBrushTypeChange('highlighter')}
            disabled={disabled}
            title="Highlighter"
          >
            <Highlighter size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};