export interface Conversation {
  id: string;
  matchId: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  participantAvatars: Record<string, string | null>;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  type: 'text' | 'image' | 'system';
  content: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';|  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';|  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
}

export interface MessageCursor {
  createdAt: string;
  id: string;
}

