import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { Bell, Heart, MessageCircle, UserPlus, BadgeCheck, Crown, X, CheckCheck, Trash2 } from 'lucide-react';
import styles from '../styles/NotificationBell.module.css';

interface NotificationBellProps {
  userId: string;
}

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  status: 'unread' | 'read';
  createdAt: string;
  actionUrl: string | null;
  data: any;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        setNotifications(
          data.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            status: n.status,
            createdAt: n.created_at,
            actionUrl: n.action_url || null,
            data: n.data || {},
          }))
        );
        setUnreadCount(data.filter((n: any) => n.status === 'unread').length);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotification = payload.new;
          setNotifications((prev) => [
            {
              id: newNotification.id,
              type: newNotification.type,
              title: newNotification.title,
              body: newNotification.body,
              status: newNotification.status,
              createdAt: newNotification.created_at,
              actionUrl: newNotification.action_url || null,
              data: newNotification.data || {},
            },
            ...prev,
          ]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, status: 'read' } : n))
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'unread');

    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('notifications').delete().eq('id', notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const clearAll = async () => {
    await supabase.from('notifications').delete().eq('user_id', userId);
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    await markAsRead(notification.id);
    setOpen(false);

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    } else if (notification.data?.post_id) {
      window.location.href = `/community?postId=${notification.data.post_id}`;
    } else if (notification.type === 'match') {
      navigate('/chats');
    } else if (notification.type === 'connection') {
      navigate('/community');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'match': return <Heart size={16} className={styles.iconMatch} />;
      case 'message': return <MessageCircle size={16} className={styles.iconMessage} />;
      case 'like': return <Heart size={16} className={styles.iconLike} />;
      case 'comment': return <MessageCircle size={16} className={styles.iconComment} />;
      case 'connection': return <UserPlus size={16} className={styles.iconConnection} />;
      case 'verification': return <BadgeCheck size={16} className={styles.iconVerify} />;
      case 'vip': return <Crown size={16} className={styles.iconVip} />;
      default: return <Bell size={16} className={styles.iconDefault} />;
    }
  };

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter((n) => n.status === 'unread')
    : notifications;

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div ref={bellRef} className={styles.container}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications (${unreadCount} unread)`}
        className={styles.bellButton}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h3 className={styles.title}>Notifications</h3>
              {unreadCount > 0 && (
                <span className={styles.unreadBadge}>{unreadCount} new</span>
              )}
            </div>
            <div className={styles.headerActions}>
              <button className={styles.iconButton} onClick={markAllAsRead} title="Mark all as read">
                <CheckCheck size={18} />
              </button>
              <button className={styles.iconButton} onClick={clearAll} title="Clear all">
                <Trash2 size={16} />
              </button>
              <button className={styles.iconButton} onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'unread' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Unread {unreadCount > 0 && <span className={styles.tabBadge}>{unreadCount}</span>}
            </button>
          </div>

          <div className={styles.list}>
            {filteredNotifications.length === 0 ? (
              <div className={styles.empty}>
                <Bell size={40} className={styles.emptyIcon} />
                <p className={styles.emptyText}>
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${notification.status === 'unread' ? styles.notificationUnread : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNotificationClick(notification);
                  }}
                >
                  <div className={styles.notificationIcon}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationTitle}>{notification.title}</p>
                    <p className={styles.notificationBody}>{notification.body}</p>
                    <span className={styles.notificationTime}>{timeAgo(notification.createdAt)}</span>
                  </div>
                  {notification.status === 'unread' && (
                    <span className={styles.unreadDot} />
                  )}
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => deleteNotification(notification.id, e)}
                    aria-label="Delete notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
