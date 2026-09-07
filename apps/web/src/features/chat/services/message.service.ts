import { supabase } from '@/config/supabase.client';

class MessageService {
  async addReaction(messageId: string, reaction: string): Promise<boolean> {
    const { error } = await supabase.rpc('add_message_reaction', {
      p_message_id: messageId,
      p_reaction: reaction,
    });
    return !error;
  }

  async removeReaction(messageId: string): Promise<boolean> {
    const { error } = await supabase.rpc('remove_message_reaction', {
      p_message_id: messageId,
    });
    return !error;
  }

  async editMessage(messageId: string, content: string): Promise<boolean> {
    const { error } = await supabase.rpc('edit_chat_message', {
      p_message_id: messageId,
      p_content: content,
    });
    return !error;
  }

  async deleteForEveryone(messageId: string): Promise<boolean> {
    const { error } = await supabase.rpc('delete_message_for_everyone', {
      p_message_id: messageId,
    });
    return !error;
  }

  async deleteForMe(messageId: string): Promise<boolean> {
    const { error } = await supabase.rpc('delete_message_for_me', {
      p_message_id: messageId,
    });
    return !error;
  }

  async pinMessage(messageId: string, conversationId: string): Promise<boolean> {
    const { error } = await supabase.rpc('pin_chat_message', {
      p_message_id: messageId,
      p_conversation_id: conversationId,
    });
    return !error;
  }

  async unpinMessage(messageId: string, conversationId: string): Promise<boolean> {
    const { error } = await supabase.rpc('unpin_chat_message', {
      p_message_id: messageId,
      p_conversation_id: conversationId,
    });
    return !error;
  }

  async setWallpaper(conversationId: string, wallpaperUrl: string | null, wallpaperColor: string): Promise<boolean> {
    const { error } = await supabase.rpc('set_chat_wallpaper', {
      p_conversation_id: conversationId,
      p_wallpaper_url: wallpaperUrl,
      p_wallpaper_color: wallpaperColor,
    });
    return !error;
  }

  async setDisappearingMessages(conversationId: string, enabled: boolean, durationHours: number): Promise<boolean> {
    const { error } = await supabase.rpc('set_disappearing_messages', {
      p_conversation_id: conversationId,
      p_enabled: enabled,
      p_duration_hours: durationHours,
    });
    return !error;
  }

  async getReactions(messageIds: string[], currentUserId: string): Promise<Map<string, { reaction: string; count: number; reactedByMe: boolean }[]>> {
    if (messageIds.length === 0) return new Map();

    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('message_id, reaction, user_id')
      .in('message_id', messageIds);

    const reactionMap = new Map<string, Map<string, { count: number; reactedByMe: boolean }>>();

    (reactions || []).forEach((r: any) => {
      if (!reactionMap.has(r.message_id)) {
        reactionMap.set(r.message_id, new Map());
      }
      const msgReactions = reactionMap.get(r.message_id)!;
      const existing = msgReactions.get(r.reaction) || { count: 0, reactedByMe: false };
      existing.count += 1;
      if (r.user_id === currentUserId) existing.reactedByMe = true;
      msgReactions.set(r.reaction, existing);
    });

    const result = new Map<string, { reaction: string; count: number; reactedByMe: boolean }[]>();
    reactionMap.forEach((reactionMap, messageId) => {
      const reactionsArray: { reaction: string; count: number; reactedByMe: boolean }[] = [];
      reactionMap.forEach((data, reaction) => {
        reactionsArray.push({ reaction, count: data.count, reactedByMe: data.reactedByMe });
      });
      result.set(messageId, reactionsArray);
    });

    return result;
  }

  async getPinnedMessages(conversationId: string): Promise<string[]> {
    const { data } = await supabase
      .from('pinned_messages')
      .select('message_id')
      .eq('conversation_id', conversationId);

    return (data || []).map((p: any) => p.message_id);
  }

  async getChatPreferences(conversationId: string, userId: string): Promise<{ wallpaperUrl: string | null; wallpaperColor: string; theme: string } | null> {
    const { data } = await supabase
      .from('chat_preferences')
      .select('wallpaper_url, wallpaper_color, theme')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return null;
    return {
      wallpaperUrl: data.wallpaper_url,
      wallpaperColor: data.wallpaper_color,
      theme: data.theme,
    };
  }

  async forwardMessage(messageId: string, targetConversationId: string, senderId: string): Promise<boolean> {
    // Get original message
    const { data: original } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (!original) return false;

    // Send as new message to target conversation
    const { error } = await supabase.rpc('send_chat_message', {
      p_conversation_id: targetConversationId,
      p_client_message_id: crypto.randomUUID(),
      p_content: original.content,
      p_type: original.type,
      p_metadata: { ...original.metadata, forwarded_from: original.conversation_id },
    });

    return !error;
  }
}

export const messageService = new MessageService();
