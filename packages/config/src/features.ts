/**
 * Feature Flags
 * Feature flag configuration and management
 */

import { isFeatureEnabled } from './environments';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultEnabled: boolean;
}

export interface FeatureFlags {
  [key: string]: FeatureFlag;
}

// Define all feature flags
export const FEATURE_FLAGS: FeatureFlags = {
  KYC_VERIFICATION: {
    key: 'KYC_VERIFICATION',
    name: 'KYC Verification',
    description: 'Enable identity verification for users',
    enabled: isFeatureEnabled('kyc'),
    defaultEnabled: true,
  },
  VIP_MEMBERSHIP: {
    key: 'VIP_MEMBERSHIP',
    name: 'VIP Membership',
    description: 'Enable VIP membership and points system',
    enabled: isFeatureEnabled('vip'),
    defaultEnabled: true,
  },
  REALTIME_UPDATES: {
    key: 'REALTIME_UPDATES',
    name: 'Realtime Updates',
    description: 'Enable realtime updates for messages and notifications',
    enabled: isFeatureEnabled('realtime'),
    defaultEnabled: true,
  },
  PUSH_NOTIFICATIONS: {
    key: 'PUSH_NOTIFICATIONS',
    name: 'Push Notifications',
    description: 'Enable push notifications',
    enabled: isFeatureEnabled('notifications'),
    defaultEnabled: true,
  },
  CONTENT_MODERATION: {
    key: 'CONTENT_MODERATION',
    name: 'Content Moderation',
    description: 'Enable automated content moderation',
    enabled: isFeatureEnabled('moderation'),
    defaultEnabled: true,
  },
  ANALYTICS: {
    key: 'ANALYTICS',
    name: 'Analytics',
    description: 'Enable analytics and tracking',
    enabled: isFeatureEnabled('analytics'),
    defaultEnabled: false,
  },
  COMMUNITY_CREATION: {
    key: 'COMMUNITY_CREATION',
    name: 'Community Creation',
    description: 'Allow users to create new communities',
    enabled: false,
    defaultEnabled: false,
  },
  MATCHING_ALGORITHM: {
    key: 'MATCHING_ALGORITHM',
    name: 'Matching Algorithm',
    description: 'Enable smart matching algorithm',
    enabled: true,
    defaultEnabled: true,
  },
  VIDEO_CALLS: {
    key: 'VIDEO_CALLS',
    name: 'Video Calls',
    description: 'Enable video calling feature',
    enabled: false,
    defaultEnabled: false,
  },
  VOICE_MESSAGES: {
    key: 'VOICE_MESSAGES',
    name: 'Voice Messages',
    description: 'Enable voice messaging',
    enabled: false,
    defaultEnabled: false,
  },
  PHOTO_VERIFICATION: {
    key: 'PHOTO_VERIFICATION',
    name: 'Photo Verification',
    description: 'Enable photo verification for profiles',
    enabled: false,
    defaultEnabled: false,
  },
  COMPATIBILITY_QUIZ: {
    key: 'COMPATIBILITY_QUIZ',
    name: 'Compatibility Quiz',
    description: 'Enable compatibility quiz for matching',
    enabled: true,
    defaultEnabled: true,
  },
};

// Helper functions
export function getFeatureFlag(key: string): FeatureFlag | undefined {
  return FEATURE_FLAGS[key];
}

export function isFeatureEnabled(key: string): boolean {
  const flag = FEATURE_FLAGS[key];
  return flag ? flag.enabled : false;
}

export function setFeatureFlag(key: string, enabled: boolean): void {
  const flag = FEATURE_FLAGS[key];
  if (flag) {
    flag.enabled = enabled;
  }
}

export function getAllFeatureFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS);
}

export function getEnabledFeatureFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.enabled);
}

export function getDisabledFeatureFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => !flag.enabled);
}

// Feature flag categories
export const FEATURE_CATEGORIES = {
  CORE: ['REALTIME_UPDATES', 'PUSH_NOTIFICATIONS', 'MATCHING_ALGORITHM'],
  VERIFICATION: ['KYC_VERIFICATION', 'PHOTO_VERIFICATION'],
  PREMIUM: ['VIP_MEMBERSHIP', 'VIDEO_CALLS', 'VOICE_MESSAGES'],
  COMMUNITY: ['COMMUNITY_CREATION', 'CONTENT_MODERATION'],
  INSIGHTS: ['ANALYTICS', 'COMPATIBILITY_QUIZ'],
} as const;

// Feature flag helpers for specific features
export const FeatureFlags = {
  isKycEnabled: () => isFeatureEnabled('KYC_VERIFICATION'),
  isVipEnabled: () => isFeatureEnabled('VIP_MEMBERSHIP'),
  isRealtimeEnabled: () => isFeatureEnabled('REALTIME_UPDATES'),
  isNotificationsEnabled: () => isFeatureEnabled('PUSH_NOTIFICATIONS'),
  isModerationEnabled: () => isFeatureEnabled('CONTENT_MODERATION'),
  isAnalyticsEnabled: () => isFeatureEnabled('ANALYTICS'),
  isCommunityCreationEnabled: () => isFeatureEnabled('COMMUNITY_CREATION'),
  isMatchingAlgorithmEnabled: () => isFeatureEnabled('MATCHING_ALGORITHM'),
  isVideoCallsEnabled: () => isFeatureEnabled('VIDEO_CALLS'),
  isVoiceMessagesEnabled: () => isFeatureEnabled('VOICE_MESSAGES'),
  isPhotoVerificationEnabled: () => isFeatureEnabled('PHOTO_VERIFICATION'),
  isCompatibilityQuizEnabled: () => isFeatureEnabled('COMPATIBILITY_QUIZ'),
};

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureCategory = keyof typeof FEATURE_CATEGORIES;