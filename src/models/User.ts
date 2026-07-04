export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  password?: string;
  displayName?: string;
  bio?: string;
  gender?: 'male' | 'female';
  avatarUri?: string;
  profilePicture?: string;
  socialLinks?: SocialLinks;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isPrivate?: boolean;
  isBlocked?: boolean;
  hasStory?: boolean;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  notificationsEnabled: boolean;
  privateAccount: boolean;
  showActivityStatus: boolean;
}
