import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { useAuthStore } from '@/store/auth.store';
import { ChatWindow } from '../../features/chat/components/ChatWindow';
import styles from './ConversationPage.module.css';

export const ConversationPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [otherUser, setOtherUser] = useState<{ id: string; name: string; avatar: string | null; verified: boolean } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      navigate('/chats', { replace: true });
      return;
    }

    const loadConversationInfo = async () => {
      if (!user) return;

      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (conversation) {
        setIsClosed(Boolean(conversation.closed_at));
        const otherUserId = conversation.participant_ids.find((id: string) => id !== user.id);
        if (otherUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, is_verified')
            .eq('user_id', otherUserId)
            .single();

          if (profile) {
            setOtherUser({
              id: profile.user_id,
              name: profile.display_name || 'User',
              avatar: profile.avatar_url || null,
              verified: profile.is_verified || false,
            });
          }

          // Check presence
          const { data: presenceData } = await supabase
            .from('presence')
            .select('is_online')
            .eq('user_id', otherUserId)
            .maybeSingle();

          if (presenceData) {
            setIsOnline(presenceData.is_online);
          }
        }
      }

      setLoading(false);
    };

    loadConversationInfo();
  }, [conversationId, user, navigate]);

  // Refetch the closed_at state when the tab regains focus or becomes visible.
  // This catches rematch → chat reopen while the user is on another tab.
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!conversationId) return;
      const { data } = await supabase
        .from('conversations')
        .select('closed_at')
        .eq('id', conversationId)
        .maybeSingle();
      if (data) {
        setIsClosed(Boolean(data.closed_at));
      }
    };

    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);

    // Immediately reopen when the ChatClosedBanner emits the event
    const onReopened = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.conversationId === conversationId) {
        setIsClosed(false);
      }
    };
    window.addEventListener('chat-reopened', onReopened);

    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('chat-reopened', onReopened);
    };
  }, [conversationId]);

  // Realtime presence updates
  useEffect(() => {
    if (!otherUser?.id) return;

    const channel = supabase
      .channel(`presence:${otherUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'presence',
        filter: `user_id=eq.${otherUser.id}`,
      }, (payload) => {
        setIsOnline(payload.new.is_online);
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [otherUser?.id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;
  }

  if (!conversationId || !otherUser) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Conversation not found</div>;
  }

  return (
    <div className={styles.container}>
      <ChatWindow
        readOnly={isClosed}
        conversationId={conversationId}
        targetUserName={otherUser.name}
        targetUserAvatar={otherUser.avatar}
        targetUserId={otherUser.id}
        verified={otherUser.verified}
        initialOnline={isOnline}
      />
    </div>
  );
};
