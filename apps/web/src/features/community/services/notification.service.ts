import { supabase } from '@/config/supabase.client';

interface CreateNotificationInput {
  userId: string;
  type: 'match' | 'message' | 'like' | 'comment' | 'connection' | 'verification' | 'vip' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const notificationService = {
  async createNotification(input: CreateNotificationInput): Promise<boolean> {
    const { error } = await supabase.from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      status: 'unread',
      data: input.data || null,
      channels: ['in_app'],
    });

    return !error;
  },

  async notifyMatch(userId: string, matchedUserName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'match',
      title: "It's a Match! 🎉",
      body: `You and ${matchedUserName} have matched! Start chatting now.`,
    });
  },

  async notifyConnectionRequest(userId: string, requesterName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'connection',
      title: 'New Connection Request',
      body: `${requesterName} wants to get to know you.`,
    });
  },

  async notifyConnectionAccepted(userId: string, targetName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'connection',
      title: 'Connection Accepted',
      body: `${targetName} accepted your request. You're now getting to know each other!`,
    });
  },

  async notifyNewMessage(userId: string, senderName: string, preview: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'message',
      title: senderName,
      body: preview,
    });
  },

  async notifyLike(userId: string, likerName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'like',
      title: 'New Like',
      body: `${likerName} liked your post.`,
    });
  },

  async notifyCommentReply(userId: string, replierName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'comment',
      title: 'New Reply',
      body: `${replierName} replied to your comment.`,
    });
  },

  async notifyPostComment(userId: string, commenterName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'comment',
      title: 'New Comment',
      body: `${commenterName} commented on your post.`,
    });
  },

  async notifyComment(userId: string, commenterName: string, preview: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'comment',
      title: 'New Comment',
      body: `${commenterName}: ${preview}`,
    });
  },
};

