import { supabase } from '@/config/supabase.client';
import type { ChatMessage, MessageReactionSummary } from '../types/chat.types';

export const messageService = {
  async getReactions(messageIds: string[], userId: string): Promise<Map<string, MessageReactionSummary[]>> {
    if (messageIds.length === 0) return new Map();
    
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (error) {
      console.error('Failed to fetch reactions:', error);
      return new Map();
    }

    const reactionMap = new Map<string, MessageReactionSummary[]>();
    
    (data || []).forEach((r: any) => {
      if (!reactionMap.has(r.message_id)) {
        reactionMap.set(r.message_id, []);
      }
      
      const existingReactions = reactionMap.get(r.message_id)!;
      const existingIndex = existingReactions.findIndex((er) => er.reaction === r.reaction);
      
      if (existingIndex >= 0) {
        existingReactions[existingIndex].count += 1;
        if (r.user_id === userId) {
          existingReactions[existingIndex].reactedByMe = true;
        }
      } else {
        existingReactions.push({
          reaction: r.reaction,
          count: 1,
          reactedByMe: r.user_id === userId
        });
      }
    });

    return reactionMap;
  },

  async addReaction(messageId: string, reaction: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .rpc('add_message_reaction', {
        p_message_id: messageId,
        p_reaction: reaction
      });

    if (error) throw error;
    return data;
  },

  async getPinnedMessages(conversationId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('pinned_messages')
      .select('message_id')
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Failed to fetch pinned messages:', error);
      return [];
    }

    return (data || []).map((p: any) => p.message_id);
  },

  async pinMessage(messageId: string, conversationId: string) {
    const { data, error } = await supabase
      .rpc('pin_chat_message', {
        p_message_id: messageId,
        p_conversation_id: conversationId
      });

    if (error) throw error;
    return data;
  },

  async unpinMessage(messageId: string, conversationId: string) {
    const { data, error } = await supabase
      .rpc('unpin_chat_message', {
        p_message_id: messageId,
        p_conversation_id: conversationId
      });

    if (error) throw error;
    return data;
  },

  async deleteForEveryone(messageId: string) {
    const { data, error } = await supabase
      .rpc('delete_message_for_everyone', {
        p_message_id: messageId
      });

    if (error) throw error;
    return data;
  },

  async editMessage(messageId: string, content: string) {
    const { data, error } = await supabase
      .rpc('edit_chat_message', {
        p_message_id: messageId,
        p_content: content
      });

    if (error) throw error;
    return data;
  },

  async forwardMessage(messageId: string, targetConversationId: string, senderId: string) {
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('content, type, metadata')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .rpc('send_chat_message', {
        p_conversation_id: targetConversationId,
        p_client_message_id: crypto.randomUUID(),
        p_content: originalMessage.content,
        p_type: originalMessage.type || 'text',
        p_metadata: { forwarded_from: messageId }
      });

    if (error) throw error;
    return data;
  },

  async getChatPreferences(conversationId: string, userId: string) {
    const { data, error } = await supabase
      .from('chat_preferences')
      .select('wallpaper_url, wallpaper_color')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch chat preferences:', error);
      return null;
    }

    return data;
  },

  async setWallpaper(conversationId: string, wallpaperUrl: string | null, wallpaperColor: string) {
    const { data, error } = await supabase
      .rpc('set_chat_wallpaper', {
        p_conversation_id: conversationId,
        p_wallpaper_url: wallpaperUrl,
        p_wallpaper_color: wallpaperColor
      });

    if (error) throw error;
    return data;
  },

  async setDisappearingMessages(conversationId: string, enabled: boolean, durationHours: number): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('set_disappearing_messages', {
        p_conversation_id: conversationId,
        p_enabled: enabled,
        p_duration_hours: durationHours
      });

    if (error) {
      console.error('Failed to set disappearing messages:', error);
      return false;
    }

    if (data && typeof data === 'object' && 'success' in data) {
      return data.success === true;
    }

    return true;
  }
};

