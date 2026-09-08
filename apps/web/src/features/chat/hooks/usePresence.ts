import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/config/supabase.client';
import { chatService } from '../services/chat.service';

export function usePresence(userId: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
  const presenceChannelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set user online when they're on the page
  useEffect(() => {
    if (!userId) return;

    // Set online immediately
    chatService.updatePresence(true).catch(() => {});

    // Heartbeat every 30 seconds to keep presence fresh
    heartbeatIntervalRef.current = setInterval(() => {
      chatService.updatePresence(true).catch(() => {});
    }, 30000);

    // Set offline when leaving page
    const handleBeforeUnload = () => {
      chatService.updatePresence(false).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        chatService.updatePresence(false).catch(() => {});
      } else if (document.visibilityState === 'visible') {
        chatService.updatePresence(true).catch(() => {});
      }
    });

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      chatService.updatePresence(false).catch(() => {});
    };
  }, [userId]);

  // Fetch initial presence data
  useEffect(() => {
    if (!userId) return;

    const fetchInitialPresence = async () => {
      try {
        const { data: presenceData, error } = await supabase
          .from('presence')
          .select('user_id, is_online, last_seen_at');

        if (error) {
          console.error('Failed to fetch presence:', error);
          return;
        }

        const onlineSet = new Set<string>();
        const lastSeenMap = new Map<string, string>();

        (presenceData || []).forEach((p: any) => {
          if (p.is_online) {
            onlineSet.add(p.user_id);
          }
          if (p.last_seen_at) {
            lastSeenMap.set(p.user_id, p.last_seen_at);
          }
        });

        setOnlineUsers(onlineSet);
        setLastSeenMap(lastSeenMap);
      } catch (err) {
        console.error('Presence fetch failed:', err);
      }
    };

    fetchInitialPresence();
  }, [userId]);

  // Subscribe to presence changes
  useEffect(() => {
    if (!userId) return;

    const presenceChannel = supabase
      .channel('presence_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence' },
        (payload) => {
          const presence = payload.new as any;
          if (!presence) return;

          setOnlineUsers((prev) => {
            const next = new Set(prev);
            if (presence.is_online) {
              next.add(presence.user_id);
            } else {
              next.delete(presence.user_id);
            }
            return next;
          });

          setLastSeenMap((prev) => {
            const next = new Map(prev);
            next.set(presence.user_id, presence.last_seen_at);
            return next;
          });
        }
      )
      .subscribe();

    presenceChannelRef.current = presenceChannel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [userId]);

  const isUserOnline = useCallback((targetUserId: string): boolean => {
    return onlineUsers.has(targetUserId);
  }, [onlineUsers]);

  const getLastSeen = useCallback((targetUserId: string): string | null => {
    return lastSeenMap.get(targetUserId) || null;
  }, [lastSeenMap]);

  return {
    isUserOnline,
    getLastSeen,
    onlineUsers,
  };
}

