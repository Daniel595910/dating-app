/**
 * VerificationBadge Component
 * Displays verification status badge
 */

import React from 'react';
import { VerificationStatus } from '@dating-app/types';
import { Badge } from '@dating-app/ui';

interface VerificationBadgeProps {
  status: VerificationStatus;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'verified':
        return { variant: 'success' as const, label: 'Verified' };
      case 'pending':
        return { variant: 'warning' as const, label: 'Pending Verification' };
      case 'rejected':
        return { variant: 'danger' as const, label: 'Verification Rejected' };
      case 'unverified':
      default:
        return { variant: 'neutral' as const, label: 'Unverified' };
    }
  };

  const config = getBadgeConfig();

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};