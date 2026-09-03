/**
 * Message Types
 * Private messages between users
 */

export type MessageType = 'text' | 'image' | 'emoji' | 'system';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  status: MessageStatus;
  mediaUrl ? : string | null;
  replyToId ? : string | null;
  editedAt ? : string | null;
  deletedAt ? : string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  mediaUrl ? : string;
  replyToId ? : string;
}

export interface UpdateMessageInput {
  content ? : string;
  status ? : MessageStatus;
  editedAt ? : string;
  deletedAt ? : string;
}

export interface MessageFilters {
  conversationId ? : string;
  senderId ? : string;
  type ? : MessageType[];
  status ? : MessageStatus[];
  dateRange ? : {
    start: string;
    end: string;
  };
  sortBy ? : 'newest' | 'oldest';
}