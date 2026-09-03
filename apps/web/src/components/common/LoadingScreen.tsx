/**\n * LoadingScreen Component
 * Full-screen loading indicator
 */

import React from 'react';
import { Spinner } from '@dating-app/ui';
import styles from './LoadingScreen.module.css';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
}) => {
  return (
    <div className={styles.container}>
      <Spinner size="lg" label={message} />
    </div>
  );
};

