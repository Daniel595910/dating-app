/**
 * ChatsPage Component
 * Chat list page
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { ChatList } from '@/components/chat/ChatList';
import { ROUTES } from '@/config/constants';
import styles from './ChatsPage.module.css';

export const ChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { loadConversations } = useChatStore();
  
  useEffect(() => {
    if (user) {
      loadConversations(user.id);
    }
  }, [user, loadConversations]);
  
  const handleSelectConversation = (conversationId: string) => {
    navigate(`${ROUTES.CHATS}/${conversationId}`);
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Chats</h1>
      <ChatList onSelectConversation={handleSelectConversation} />
    </div>
  );
};