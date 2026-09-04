import { supabase } from '@/config/supabase.client';
import { generateUUID } from '../utils/uuid';
import { Conversation, ChatMessage, MessageCursor } from '../types/chat.types';

class ChatService {
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50);

    if (!conversations || conversations.length === 0) return [];

    const otherUserIds = conversations
      .flatMap((c: any) => c.participant_ids)
      .filter((id: string) => id !== userId);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', otherUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const { data: presenceData } = await supabase
      .from('presence')
      .select('user_id, is_online')
      .in('user_id', otherUserIds);

    const presenceMap = new Map((presenceData || []).map((p: any) => [p.user_id, p.is_online]));

    return conversations.map((conv: any) => {
      const otherUserId = conv.participant_ids.find((id: string) => id !== userId);
      const profile = profileMap.get(otherUserId);

      return {
        id: conv.id,
        matchId: conv.match_id,
        participantIds: conv.participant_ids,
        participantNames: { [otherUserId]: profile?.display_name || 'User' },
        participantAvatars: { [otherUserId]: profile?.avatar_url || null },
        lastMessage: conv.last_message_preview || null,
        lastMessageAt: conv.last_message_at || null,
        unreadCount: conv.unread_counts?.[userId] || 0,
        isOnline: presenceMap.get(otherUserId) || false,
      };
    });
  }

  async getMessages(
    conversationId: string,
    limit: number = 50,
    cursor?: MessageCursor | null
  ): Promise<{ messages: ChatMessage[]; nextCursor: MessageCursor | null; hasMore: boolean }> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor.createdAt);
    }

    const { data: messages } = await query;

    if (!messages || messages.length === 0) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    const hasMore = messages.length > limit;
    const feedMessages = hasMore ? messages.slice(0, limit) : messages;

    const senderIds = [...new Set(feedMessages.map((m: any) => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', senderIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const chatMessages: ChatMessage[] = feedMessages.reverse().map((m: any) => {
      const profile = profileMap.get(m.sender_id);
      return {
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderName: profile?.display_name || 'User',
        senderAvatar: profile?.avatar_url || null,
        type: m.type,
        content: m.content,
        metadata: m.metadata || undefined,
        status: m.status,
        createdAt: m.created_at,
      };
    });

    const oldestMessage = feedMessages[feedMessages.length - 1];
    const nextCursor: MessageCursor | null = hasMore
      ? { createdAt: oldestMessage.created_at, id: oldestMessage.id }
      : null;

    return { messages: chatMessages, nextCursor, hasMore };
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: string = 'text'
  ): Promise<ChatMessage | null> {
    const clientMessageId = generateUUID();

    const { data, error } = await supabase.rpc('send_chat_message', {
      p_conversation_id: conversationId,
      p_client_message_id: clientMessageId,
      p_content: content,
      p_type: type,
      p_metadata: null,
    });

    if (error) {
      if (error.message.includes('Rate limit')) {
        throw new Error('You are sending messages too quickly. Please wait a moment.');
      }
      if (error.message.includes('blocked')) {
        throw new Error('You cannot message this user.');
      }
      throw error;
    }
    if (!data) return null;

    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('id', data.id)
      .single();

    if (!message) return null;

    return {
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      senderName: 'You',
      senderAvatar: null,
      type: message.type,
      content: message.content,
      metadata: message.metadata || undefined,
      status: 'sent' as const,
      createdAt: message.created_at,
    };
  }

  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    await supabase.rpc('update_message_status', {
      p_message_id: messageId,
      p_status: status,
    });
  }

  async updatePresence(isOnline: boolean): Promise<void> {
    await supabase.rpc('update_presence', {
      p_is_online: isOnline,
    });
  }

  subscribeToMessages(
    conversationId: string,
    callback: (message: any) => void
  ): () => void {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe();

    return () => channel.unsubscribe();
  }
}

export const chatService = new ChatService();

