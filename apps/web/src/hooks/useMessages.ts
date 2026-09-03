/**
 * useMessages Hook
 * Message management with realtime
 */

import { useState, useCallback, useEffect } from 'react';
import { Message } from '@dating-app/types';
import { chatService } from '@/services/chat.service';

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  loadMessages: (conversationId: string) => Promise < void > ;
  sendMessage: (input: any) => Promise < Message | null > ;
  deleteMessage: (messageId: string) => Promise < boolean > ;
}

export function useMessages(conversationId ? : string): UseMessagesReturn {
  const [messages, setMessages] = useState < Message[] > ([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const loadMessages = useCallback(async (convId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedMessages = await chatService.getMessages(convId);
      setMessages(fetchedMessages);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const sendMessage = useCallback(async (input: any) => {
    setError(null);
    
    try {
      const message = await chatService.sendMessage(input);
      if (message) {
        setMessages((prev) => [...prev, message]);
      }
      return message;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      return null;
    }
  }, []);
  
  const deleteMessage = useCallback(async (messageId: string) => {
    setError(null);
    
    try {
      const success = await chatService.deleteMessage(messageId);
      if (success) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete message');
      return false;
    }
  }, []);
  
  useEffect(() => {
    if (!conversationId) return;
    
    const unsubscribe = chatService.subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((msg) => msg.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });
    
    return () => {
      unsubscribe();
    };
  }, [conversationId]);
  
  return {
    messages,
    loading,
    error,
    loadMessages,
    sendMessage,
    deleteMessage,
  };
}