import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { chatService } from '../../features/chat/services/chat.service';
import { Conversation } from '../../features/chat/types/chat.types';
import { MessageCircle, ArrowRight } from 'lucide-react';
import styles from './ChatsPage.module.css';

export const ChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      setLoading(true);
      const convs = await chatService.getUserConversations(user.id);
      setConversations(convs);
      setLoading(false);
    };

    loadConversations();
  }, [user]);

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/chats/${conversationId}`);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <MessageCircle size={40} />
        </div>
        <h2 className={styles.emptyTitle}>No conversations yet</h2>
        <p className={styles.emptyText}>
          Matches and connections you start talking to will appear here.
        </p>
        <button
          className={styles.exploreButton}
          onClick={() => navigate('/community')}
        >
          Explore Community
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Chats</h1>
      <div className={styles.conversationList}>
        {conversations.map((conv) => {
          const otherUserId = conv.participantIds.find((id) => id !== user?.id);
          const otherUserName = otherUserId ? conv.participantNames[otherUserId] : 'User';
          const otherUserAvatar = otherUserId ? conv.participantAvatars[otherUserId] : null;

          return (
            <button
              key={conv.id}
              className={styles.conversationItem}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <div className={styles.avatar}>
                {otherUserAvatar ? (
                  <img src={otherUserAvatar} alt={otherUserName} />
                ) : (
                  otherUserName?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <div className={styles.conversationInfo}>
                <div className={styles.conversationHeader}>
                  <span className={styles.conversationName}>{otherUserName}</span>
                  {conv.lastMessageAt && (
                    <span className={styles.timestamp}>
                      {new Date(conv.lastMessageAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className={styles.lastMessage}>{conv.lastMessage}</p>
                )}
              </div>
              {conv.unreadCount > 0 && (
                <span className={styles.unreadBadge}>
                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
