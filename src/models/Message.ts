import { MediaItem } from './MediaItem';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'unsent' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  media?: MediaItem[];
  status: MessageStatus;
  createdAt: string;
  editedAt?: string;
  replyToMessageId?: string;
  sharedPostId?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}
