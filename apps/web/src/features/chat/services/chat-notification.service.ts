import { supabase } from '@/config/supabase.client';

class ChatNotificationService {
  private activeConversationId: string | null = null;

  setActiveConversation(conversationId: string | null) {
    this.activeConversationId = conversationId;
  }

  async sendMessageNotification(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> {
    // If recipient is currently viewing this conversation, skip push notification
    if (this.activeConversationId === conversationId) return;

    try {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'message',
        title: senderName,
        body: messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview,
        status: 'unread',
        data: {
          conversation_id: conversationId,
          url: `/chats/${conversationId}`,
          tag: `chat-${conversationId}`,
        },
        channels: ['in_app', 'push'],
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  async sendImageNotification(recipientId: string, senderName: string, conversationId: string): Promise<void> {
    if (this.activeConversationId === conversationId) return;

    try {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'message',
        title: senderName,
        body: 'Sent a photo',
        status: 'unread',
        data: { conversation_id: conversationId, url: `/chats/${conversationId}`, tag: `chat-${conversationId}` },
        channels: ['in_app', 'push'],
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  async sendVoiceNotification(recipientId: string, senderName: string, conversationId: string): Promise<void> {
    if (this.activeConversationId === conversationId) return;

    try {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'message',
        title: senderName,
        body: 'Sent a voice message',
        status: 'unread',
        data: { conversation_id: conversationId, url: `/chats/${conversationId}`, tag: `chat-${conversationId}` },
        channels: ['in_app', 'push'],
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  async sendGiftNotification(recipientId: string, senderName: string, giftName: string, conversationId: string): Promise<void> {
    if (this.activeConversationId === conversationId) return;

    try {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'message',
        title: senderName,
        body: `Sent you a ${giftName}`,
        status: 'unread',
        data: { conversation_id: conversationId, url: `/chats/${conversationId}`, tag: `chat-${conversationId}` },
        channels: ['in_app', 'push'],
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }
}

export const chatNotificationService = new ChatNotificationService();
