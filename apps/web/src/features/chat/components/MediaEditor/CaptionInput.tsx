import React, { useEffect, useRef } from 'react';
import styles from './MediaEditor.module.css';

interface CaptionInputProps {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

export const CaptionInput: React.FC<CaptionInputProps> = ({
  value,
  onChange,
  maxLength = 500,
  placeholder = 'Add a caption...',
  disabled = false,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={styles.caption}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={1}
      disabled={disabled}
    />
  );
};