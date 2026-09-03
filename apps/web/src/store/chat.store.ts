/**
 * Chat Store
 * Chat and conversation state management using Zustand
 */

import { create } from 'zustand';
import { Conversation, Message } from '@dating-app/types';
import { chatService } from '@/services/chat.service';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  loadConversations: (userId: string) => Promise < void > ;
  loadMessages: (conversationId: string) => Promise < void > ;
  sendMessage: (input: any) => Promise < Message | null > ;
  addMessage: (message: Message) => void;
  clearError: () => void;
}

export const useChatStore = create < ChatState > ((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,
  error: null,
  
  setActiveConversation: (conversation) =>
    set({
      activeConversation: conversation,
      messages: [],
    }),
  
  clearError: () => set({ error: null }),
  
  loadConversations: async (userId) => {
    set({ loading: true, error: null });
    
    try {
      const conversations = await chatService.getUserConversations(userId);
      set({ conversations, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load conversations',
        loading: false,
      });
    }
  },
  
  loadMessages: async (conversationId) => {
    set({ loading: true, error: null });
    
    try {
      const messages = await chatService.getMessages(conversationId);
      set({ messages, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load messages',
        loading: false,
      });
    }
  },
  
  sendMessage: async (input) => {
    set({ error: null });
    
    try {
      const message = await chatService.sendMessage(input);
      if (message) {
        set((state) => ({
          messages: [...state.messages, message],
        }));
        
        // Update conversation last message
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === input.conversationId ?
            {
              ...conv,
              last_message_at: new Date().toISOString(),
              last_message_preview: input.content.substring(0, 100),
            } :
            conv
          ),
        }));
      }
      return message;
    } catch (error: any) {
      set({ error: error.message || 'Failed to send message' });
      return null;
    }
  },
  
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
}));