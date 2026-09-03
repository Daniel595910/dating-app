/**
 * useConversations Hook
 * Conversation management
 */

import { useState, useCallback } from 'react';
import { Conversation } from '@dating-app/types';
import { chatService } from '@/services/chat.service';

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  loadConversations: (userId: string) => Promise < void > ;
  createConversation: (matchId: string, participantIds: string[]) => Promise < Conversation | null > ;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState < Conversation[] > ([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const loadConversations = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const userConversations = await chatService.getUserConversations(userId);
      setConversations(userConversations);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const createConversation = useCallback(async (matchId: string, participantIds: string[]) => {
    setError(null);
    
    try {
      const conversation = await chatService.createConversation(matchId, participantIds);
      if (conversation) {
        setConversations((prev) => [conversation, ...prev]);
      }
      return conversation;
    } catch (err: any) {
      setError(err.message || 'Failed to create conversation');
      return null;
    }
  }, []);
  
  return {
    conversations,
    loading,
    error,
    loadConversations,
    createConversation,
  };
}