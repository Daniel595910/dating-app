/**\n * Chat Service
 * Handles conversation and message operations
 */

import { supabase } from '@/config/supabase.client';
import { Conversation, Message, CreateMessageInput } from '@dating-app/types';

class ChatService {
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [userId])
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as Conversation[];
    } catch {
      return [];
    }
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data as Conversation;
    } catch {
      return null;
    }
  }

  async createConversation(
    matchId: string,
    participantIds: string[]
  ): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          match_id: matchId,
          participant_ids: participantIds,
          unread_counts: Object.fromEntries(participantIds.map((id) => [id, 0])),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Conversation;
    } catch {
      return null;
    }
  }

  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data || []) as Message[];
    } catch {
      return [];
    }
  }

  async sendMessage(input: CreateMessageInput): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(input)
        .select()
        .single();

      if (error) throw error;

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: input.content.substring(0, 100),
        })
        .eq('id', input.conversationId);

      return data as Message;
    } catch {
      return null;
    }
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ): () => void {
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
          callback(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const chatService = new ChatService();

