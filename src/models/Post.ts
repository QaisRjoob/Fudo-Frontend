import { MediaItem } from './MediaItem';
import { User } from './User';

export interface PostAnalytics {
  impressions: number;
  views: number;
  saves: number;
  shares: number;
  reach: number;
}

export interface Post {
  id: string;
  authorId: string;
  caption?: string;
  title?: string;
  cookTime?: number;
  prepTime?: number;
  servings?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients?: string[];
  steps?: string[];
  tags?: string[];
  location?: string;
  media: MediaItem[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
  isArchived?: boolean;
  isSaved?: boolean;
  isLiked?: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'failed';
  analytics?: PostAnalytics;
  author?: User;
}

export interface PostWithAuthor extends Post {
  author?: User;
}
