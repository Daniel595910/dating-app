/**
 * Conversation Types
 * Private conversations between matched users
 */

export type ConversationStatus = 'active' | 'archived' | 'deleted';

export interface Conversation {
  id: string;
  matchId: string;
  participantIds: string[];
  status: ConversationStatus;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  leftAt?: string | null;
  isMuted: boolean;
  isBlocked: boolean;
  lastReadAt?: string | null;
}

export interface CreateConversationInput {
  matchId: string;
  participantIds: string[];
}

export interface UpdateConversationInput {
  status?: ConversationStatus;
  lastMessageAt?: string;
  lastMessagePreview?: string;
}