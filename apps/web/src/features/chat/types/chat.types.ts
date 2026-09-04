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
  type: 'text' | 'image' | 'voice' | 'gift' | 'system';
  content: string;
  metadata?: {
    imageUrl?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    durationMs?: number;
    giftId?: string;
    giftName?: string;
    giftIcon?: string;
    waveformData?: number[];
  };
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
}

export interface MessageCursor {
  createdAt: string;
  id: string;
}
