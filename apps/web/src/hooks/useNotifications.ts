/**
 * useNotifications Hook
 * Notification management with realtime
 */

import { useState, useCallback, useEffect } from 'react';
import { Notification } from '@dating-app/types';
import { notificationService } from '@/services/notification.service';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  loadNotifications: (userId: string) => Promise < void > ;
  loadUnreadCount: (userId: string) => Promise < void > ;
  markAsRead: (notificationId: string) => Promise < boolean > ;
  markAllAsRead: (userId: string) => Promise < boolean > ;
  deleteNotification: (notificationId: string) => Promise < boolean > ;
}

export function useNotifications(userId ? : string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState < Notification[] > ([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const loadNotifications = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedNotifications = await notificationService.getNotifications(uid);
      setNotifications(fetchedNotifications);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const loadUnreadCount = useCallback(async (uid: string) => {
    try {
      const count = await notificationService.getUnreadCount(uid);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Failed to load unread count:', err);
    }
  }, []);
  
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const success = await notificationService.markAsRead(notificationId);
      if (success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId ?
            { ...notification, status: 'read', read_at: new Date().toISOString() } :
            notification
          )
        );
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to mark as read');
      return false;
    }
  }, []);
  
  const markAllAsRead = useCallback(async (uid: string) => {
    try {
      const success = await notificationService.markAllAsRead(uid);
      if (success) {
        setNotifications((prev) =>
          prev.map((notification) => ({
            ...notification,
            status: 'read',
            read_at: new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read');
      return false;
    }
  }, []);
  
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const success = await notificationService.deleteNotification(notificationId);
      if (success) {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== notificationId)
        );
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete notification');
      return false;
    }
  }, []);
  
  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = notificationService.subscribeToNotifications(userId, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
    
    return () => {
      unsubscribe();
    };
  }, [userId]);
  
  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}