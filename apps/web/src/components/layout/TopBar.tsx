/**
 * TopBar Component
 * Top application bar with context-aware content
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/constants';
import { getNavigationByPath } from '@/config/navigation';
import styles from './TopBar.module.css';
import { useSettings } from '@/hooks/useSettings';

export const TopBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const appName = useSettings((s) => s.settings['general.app_name']);

  const navigationItem = getNavigationByPath(location.pathname);
  const title = navigationItem?.label || appName || 'Dating App';
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const showBackButton = location.pathname !== ROUTES.COMMUNITY;
  
  return (
    <header className={styles.topBar}>
      <div className={styles.topBarContent}>
        {showBackButton && (
          <button
            className={styles.backButton}
            onClick={handleBack}
            aria-label="Go back"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}
        <h1 className={styles.title}>{title}</h1>
      </div>
    </header>
  );
};
