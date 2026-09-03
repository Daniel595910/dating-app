/**\n * ImageUpload Component
 * Handles image upload with preview
 */

import React, { useRef, useState } from 'react';
import { getUploadConfig, UploadPurpose, isFileTypeAllowed, isFileSizeAllowed } from '@/config/storage.config';
import { Button } from '@dating-app/ui';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  purpose: UploadPurpose;
  onUpload: (file: File) => void;
  onError?: (error: string) => void;
  maxCount?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  purpose,
  onUpload,
  onError,
  maxCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const config = getUploadConfig(purpose);
  const effectiveMaxCount = maxCount || config.maxCount;

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    const selectedFiles = Array.from(files);

    // Validate file count
    if (selectedFiles.length + previews.length > effectiveMaxCount) {
      const errorMsg = `Maximum ${effectiveMaxCount} files allowed`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validate each file
    for (const file of selectedFiles) {
      if (!isFileTypeAllowed(purpose, file.type)) {
        const errorMsg = `File type ${file.type} not allowed`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      if (!isFileSizeAllowed(purpose, file.size)) {
        const errorMsg = `File size exceeds ${config.maxSizeBytes / 1024 / 1024}MB`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }
    }

    // Create previews and trigger upload
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setPreviews((prev) => [...prev, preview]);
      };
      reader.readAsDataURL(file);
      onUpload(file);
    });
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removePreview = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept={config.allowedTypes.join(',')}
        multiple={effectiveMaxCount > 1}
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />
      <Button type="button" variant="outline" onClick={handleClick}>
        Upload {purpose.replace('_', ' ')}
      </Button>
      {error && <p className={styles.error}>{error}</p>}
      {previews.length > 0 && (
        <div className={styles.previews}>
          {previews.map((preview, index) => (
            <div key={index} className={styles.previewItem}>
              <img src={preview} alt={`Preview ${index + 1}`} className={styles.previewImage} />
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removePreview(index)}
                aria-label="Remove image"
              >
                âœ•
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

