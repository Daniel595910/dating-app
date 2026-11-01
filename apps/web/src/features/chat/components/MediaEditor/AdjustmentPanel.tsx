import React from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import { Adjustments, DEFAULT_ADJUSTMENTS, cssFilterFromAdjustments, isDefaultAdjustments } from '../../utils/mediaEditor';
import styles from './AdjustmentPanel.module.css';

interface AdjustmentPanelProps {
  imageUrl: string;
  adjustments: Adjustments;
  onChange: (next: Adjustments) => void;
  onDone: () => void;
  disabled?: boolean;
}

type SliderKey = keyof Adjustments;

const SLIDERS: Array<{ key: SliderKey; label: string }> = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast',   label: 'Contrast'   },
  { key: 'saturation', label: 'Saturation' },
  { key: 'warmth',     label: 'Warmth'     },
];

export const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({
  imageUrl,
  adjustments,
  onChange,
  onDone,
  disabled = false,
}) => {
  const handleChange = (key: SliderKey, value: number) => {
    onChange({ ...adjustments, [key]: value });
  };

  const reset = () => {
    onChange({ ...DEFAULT_ADJUSTMENTS });
  };

  const filterStyle = !isDefaultAdjustments(adjustments)
    ? { filter: cssFilterFromAdjustments(adjustments) }
    : {};

  return (
    <div className={styles.overlay}>
      {/* HEADER */}
      <div className={styles.header}>
        <button className={styles.textBtn} onClick={onDone} disabled={disabled}>Cancel</button>
        <span className={styles.title}>Adjustments</span>
        <button className={`${styles.textBtn} ${styles.doneBtn}`} onClick={onDone} disabled={disabled}>Done</button>
      </div>

      {/* IMAGE VIEWPORT */}
      <div className={styles.viewport}>
        <img src={imageUrl} alt="Adjust Preview" className={styles.image} style={filterStyle} />
      </div>

      {/* BOTTOM CONTROLS */}
      <div className={styles.toolbar}>
        <div className={styles.sliderHeaderRow}>
          <span className={styles.sectionTitle}>Image Adjustments</span>
          <button className={styles.resetBtn} onClick={reset} disabled={disabled}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
        <div className={styles.sliderContainer}>
          {SLIDERS.map(({ key, label }) => {
            const value = adjustments[key];
            return (
              <div key={key} className={styles.sliderRow}>
                <div className={styles.sliderHeader}>
                  <span className={styles.sliderLabel}>{label}</span>
                  <span className={styles.sliderValue}>{value}</span>
                </div>
                <input
                  type="range"
                  className={styles.sliderInput}
                  min={0}
                  max={200}
                  step={1}
                  value={value}
                  onChange={(e) => handleChange(key, Number(e.target.value))}
                  disabled={disabled}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};