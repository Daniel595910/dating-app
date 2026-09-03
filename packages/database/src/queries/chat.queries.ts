/**
 * Chat Database Queries
 * Type-safe database operations for conversations and messages
 */

import { SupabaseService, handleDatabaseError } from '../supabase';
import type { Conversation, Message, CreateMessageInput } from '@dating-app/types';

export class ChatQueries {
  private service: SupabaseService;
  
  constructor(service ? : SupabaseService) {
    this.service = service || SupabaseService.getInstance();
  }
  
  async getConversationById(conversationId: string): Promise < Conversation | null > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      return data as Conversation | null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getUserConversations(userId: string): Promise < Conversation[] > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('conversations')
        .select('*')
        .contains('participant_ids', [userId])
        .order('last_message_at', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return (data || []) as Conversation[];
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async createConversation(matchId: string, participantIds: string[]): Promise < Conversation > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('conversations')
        .insert({
          match_id: matchId,
          participant_ids: participantIds,
          unread_counts: Object.fromEntries(participantIds.map(id => [id, 0])),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Conversation;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getMessagesByConversation(conversationId: string, limit = 100): Promise < Message[] > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []).reverse() as Message[];
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async sendMessage(input: CreateMessageInput): Promise < Message > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('messages')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update conversation last message
      await this.service
        .getClient()
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: input.content.substring(0, 100),
        })
        .eq('id', input.conversationId);
      
      return data as Message;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async markMessageAsRead(messageId: string): Promise < void > {
    try {
      const { error } = await this.service
        .getClient()
        .from('messages')
        .update({ status: 'read' })
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async deleteMessage(messageId: string): Promise < void > {
    try {
      const { error } = await this.service
        .getClient()
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async subscribeToConversation(
    conversationId: string,
    callback: (message: Message) => void
  ): Promise < () => void > {
    const subscription = this.service
      .getClient()
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
          callback(payload.new as Message);
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }
}