/**
 * ChatWindow Component
 * Active conversation window
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/config/supabase.client';
import { Message } from '@dating-app/types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import styles from './ChatWindow.module.css';

interface ChatWindowProps {
  conversationId: string;
}

export const ChatWindow: React.FC < ChatWindowProps > = ({ conversationId }) => {
  const [messages, setMessages] = useState < Message[] > ([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  const [currentUserId, setCurrentUserId] = useState < string | null > (null);
  const messagesEndRef = useRef < HTMLDivElement > (null);
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  const fetchMessages = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      setCurrentUserId(user.id);
      
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (fetchError) throw fetchError;
      setMessages(data || []);
      scrollToBottom();
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, scrollToBottom]);
  
  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          scrollToBottom();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, fetchMessages, scrollToBottom]);
  
  if (loading) {
    return <div className={styles.loading}>Loading messages...</div>;
  }
  
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }
  
  return (
    <div className={styles.chatWindow}>
      <div className={styles.messages}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUserId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput conversationId={conversationId} />
    </div>
  );
};