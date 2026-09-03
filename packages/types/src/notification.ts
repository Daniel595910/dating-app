/**
 * Notification Types
 * User notifications and related types
 */

export type NotificationType = 
  | 'match'
  | 'message'
  | 'like'
  | 'comment'
  | 'mention'
  | 'system'
  | 'verification'
  | 'vip'
  | 'report'
  | 'community';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  status: NotificationStatus;
  data?: Record<string, any> | null;
  actionUrl?: string | null;
  channels: NotificationChannel[];
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  channels?: NotificationChannel[];
}

export interface NotificationPreferences {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationInput {
  status?: NotificationStatus;
  readAt?: string;
}