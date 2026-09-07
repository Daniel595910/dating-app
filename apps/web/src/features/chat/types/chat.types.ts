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
  type: 'text' | 'image' | 'voice' | 'gift' | 'system' | 'audio';
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
    audioUrl?: string;
    fileName?: string;
  };
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  edited_at?: string;
  deleted_for_everyone?: boolean;
}

export interface MessageCursor {
  createdAt: string;
  id: string;
}

export interface MessageReactionSummary {
  reaction: string;
  count: number;
  reactedByMe: boolean;
}
