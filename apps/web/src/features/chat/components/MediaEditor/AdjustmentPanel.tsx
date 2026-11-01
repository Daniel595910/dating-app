import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Adjustments, DEFAULT_ADJUSTMENTS } from '../../utils/mediaEditor';
import styles from './MediaEditor.module.css';

interface AdjustmentPanelProps {
  adjustments: Adjustments;
  onChange: (next: Adjustments) => void;
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
  adjustments,
  onChange,
  disabled = false,
}) => {
  const handleChange = (key: SliderKey, value: number) => {
    onChange({ ...adjustments, [key]: value });
  };

  const handleResetOne = (key: SliderKey) => {
    onChange({ ...adjustments, [key]: DEFAULT_ADJUSTMENTS[key] });
  };

  const anyNonDefault = SLIDERS.some(
    ({ key }) => adjustments[key] !== DEFAULT_ADJUSTMENTS[key]
  );

  const handleResetAll = () => {
    onChange({ ...DEFAULT_ADJUSTMENTS });
  };

  return (
    <div className={styles.adjustPanel}>
      {SLIDERS.map(({ key, label }) => {
        const value = adjustments[key];
        const isDefault = value === DEFAULT_ADJUSTMENTS[key];
        return (
          <div key={key} className={styles.sliderRow}>
            <div className={styles.sliderHeader}>
              <span className={styles.sliderLabel}>{label}</span>
              <span className={styles.sliderValue}>{value}</span>
              {!isDefault && (
                <button
                  type="button"
                  className={styles.sliderResetBtn}
                  onClick={() => handleResetOne(key)}
                  disabled={disabled}
                  aria-label={`Reset ${label}`}
                  title={`Reset ${label}`}
                >
                  <RotateCcw size={12} />
                </button>
              )}
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
              aria-label={label}
            />
          </div>
        );
      })}

      {anyNonDefault && (
        <button
          type="button"
          className={styles.resetAllBtn}
          onClick={handleResetAll}
          disabled={disabled}
        >
          Reset All Adjustments
        </button>
      )}
    </div>
  );
};