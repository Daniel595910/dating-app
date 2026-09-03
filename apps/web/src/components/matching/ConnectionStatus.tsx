/**
 * ConnectionStatus Component
 * Displays connection progress between users
 */

import React from 'react';
import { MatchStage } from '@dating-app/types';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
  stage: MatchStage;
  daysConnected ? : number;
  progress ? : number;
}

export const ConnectionStatus: React.FC < ConnectionStatusProps > = ({
  stage,
  daysConnected = 0,
  progress = 0,
}) => {
  const stages: MatchStage[] = ['getting_to_know', 'compatibility_check', 'matched'];
  const currentStageIndex = stages.indexOf(stage);
  
  const getStageLabel = (s: MatchStage): string => {
    switch (s) {
      case 'getting_to_know':
        return 'Getting to Know';
      case 'compatibility_check':
        return 'Compatibility Check';
      case 'matched':
        return 'Matched';
      default:
        return s;
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.daysLabel}>
          {daysConnected > 0 ? `Day ${daysConnected}` : 'Just started'}
        </span>
        <span className={styles.stageLabel}>{getStageLabel(stage)}</span>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>

      <div className={styles.stages}>
        {stages.map((s, index) => (
          <div
            key={s}
            className={`${styles.stageIndicator} ${
              index <= currentStageIndex ? styles.stageComplete : ''
            } ${index === currentStageIndex ? styles.stageCurrent : ''}`}
          >
            <div className={styles.stageDot} />
            <span className={styles.stageName}>{getStageLabel(s)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};