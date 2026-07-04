import { MediaItem } from './MediaItem';
import { User } from './User';

export interface Story {
  id: string;
  authorId: string;
  media: MediaItem;
  createdAt: string;
  expiresAt?: string;
  views: number;
  repliesCount: number;
  isHighlighted?: boolean;
  highlightId?: string;
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

export interface StoryGroup {
  authorId: string;
  author: User;
  stories: Story[];
  hasUnseen: boolean;
}

export interface StoryHighlight {
  id: string;
  userId: string;
  title: string;
  coverUri?: string;
  storyIds: string[];
  createdAt: string;
}
