import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { Bell } from 'lucide-react';

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
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

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

    return () => {
      channel.unsubscribe();
    };
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

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  const handleNotificationClick = async (notification: AppNotification) => {
    // Mark as read
    await markAsRead(notification.id);
    setOpen(false);

    // Navigate based on notification type
    if (notification.actionUrl) {
      // Use action_url if available
      window.location.href = notification.actionUrl;
    } else if (notification.data?.post_id) {
      // Navigate to post with comment
      navigate(`/community?postId=${notification.data.post_id}&commentId=${notification.data.comment_id || ''}`);
    } else if (notification.type === 'match') {
      // Navigate to chats
      navigate('/chats');
    } else if (notification.type === 'connection') {
      // Navigate to community
      navigate('/community');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'match': return '❤️';
      case 'message': return '💬';
      case 'like': return '👍';
      case 'comment': return '💭';
      case 'connection': return '🤝';
      case 'verification': return '✅';
      case 'vip': return '💎';
      case 'system': return '📢';
      default: return '🔔';
    }
  };

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#6b7280',
          padding: '8px',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
          position: 'relative',
        }}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              minWidth: 18,
              height: 18,
              borderRadius: '9999px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            right: '8px',
            zIndex: 99999,
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            width: '320px',
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#3b82f6',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  background: notification.status === 'unread' ? '#fef2f2' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #f9fafb',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>
                  {getTypeIcon(notification.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: notification.status === 'unread' ? 600 : 400,
                      color: '#111827',
                      margin: 0,
                    }}
                  >
                    {notification.title}
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '2px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {notification.body}
                  </p>
                  <p style={{ fontSize: '10px', color: '#9ca3af', margin: '4px 0 0' }}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

