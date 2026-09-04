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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversationInfo = async () => {
      if (!conversationId || !user) return;

      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (conversation) {
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
        }
      }

      setLoading(false);
    };

    loadConversationInfo();
  }, [conversationId, user]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>;
  }

  if (!conversationId || !otherUser) {
    navigate('/chats');
    return null;
  }

  return (
    <div className={styles.container}>
      <ChatWindow
        conversationId={conversationId}
        targetUserName={otherUser.name}
        targetUserAvatar={otherUser.avatar}
        targetUserId={otherUser.id}
        verified={otherUser.verified}
      />
    </div>
  );
};
