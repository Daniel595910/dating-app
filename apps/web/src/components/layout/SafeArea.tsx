 * SafeArea Component
 * Provides safe area insets for mobile devices
 */

import React from 'react';
import styles from './SafeArea.module.css';

interface SafeAreaProps {
  children: React.ReactNode;
}

export const SafeArea: React.FC<SafeAreaProps> = ({ children }) => {
  return <div className={styles.safeArea}>{children}</div>;
};