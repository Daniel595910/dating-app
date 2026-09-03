/**
 * ChatList Component
 * List of conversations
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { Conversation } from '@dating-app/types';
import { UserAvatar } from '../common/UserAvatar';
import { LoadingScreen } from '../common/LoadingScreen';
import styles from './ChatList.module.css';

interface ChatListProps {
  onSelectConversation ? : (conversationId: string) => void;
}

export const ChatList: React.FC < ChatListProps > = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState < Conversation[] > ([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error: fetchError } = await supabase
          .from('conversations')
          .select('*')
          .contains('participant_ids', [user.id])
          .order('last_message_at', { ascending: false, nullsFirst: false });
        
        if (fetchError) throw fetchError;
        setConversations(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, []);
  
  if (loading) {
    return <LoadingScreen message="Loading conversations..." />;
  }
  
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }
  
  if (conversations.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>
          No conversations yet. Match with someone to start chatting!
        </p>
      </div>
    );
  }
  
  return (
    <div className={styles.list}>
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          className={styles.conversationItem}
          onClick={() => onSelectConversation?.(conversation.id)}
        >
          <UserAvatar name="User" size="md" />
          <div className={styles.conversationInfo}>
            <div className={styles.conversationHeader}>
              <span className={styles.conversationName}>User</span>
              {conversation.last_message_at && (
                <span className={styles.timestamp}>
                  {new Date(conversation.last_message_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {conversation.last_message_preview && (
              <p className={styles.preview}>{conversation.last_message_preview}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};