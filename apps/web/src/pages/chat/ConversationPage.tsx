/**
 * ConversationPage Component
 * Individual conversation view
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ROUTES } from '@/config/constants';
import styles from './ConversationPage.module.css';

export const ConversationPage: React.FC = () => {
  const { conversationId } = useParams < { conversationId: string } > ();
  const navigate = useNavigate();
  
  if (!conversationId) {
    navigate(ROUTES.CHATS);
    return null;
  }
  
  return (
    <div className={styles.container}>
      <ChatWindow conversationId={conversationId} />
    </div>
  );
};