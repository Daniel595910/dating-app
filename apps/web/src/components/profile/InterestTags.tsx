/**
 * InterestTags Component
 * Displays user interests as tags
 */

import React from 'react';
import styles from './InterestTags.module.css';

interface InterestTagsProps {
  interests: string[];
  onRemove ? : (interest: string) => void;
  editable ? : boolean;
}

export const InterestTags: React.FC < InterestTagsProps > = ({
  interests,
  onRemove,
  editable = false,
}) => {
  if (interests.length === 0) {
    return <p className={styles.empty}>No interests added yet</p>;
  }
  
  return (
    <div className={styles.tags}>
      {interests.map((interest, index) => (
        <span key={index} className={styles.tag}>
          {interest}
          {editable && onRemove && (
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => onRemove(interest)}
              aria-label={`Remove ${interest}`}
            >
              ✕
            </button>
          )}
        </span>
      ))}
    </div>
  );
};