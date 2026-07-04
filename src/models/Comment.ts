export interface Comment {
  id: string;
  postId?: string;
  storyId?: string;
  authorId: string;
  text: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt?: string;
  replyToCommentId?: string;
}

export interface CommentWithAuthor extends Comment {
  author?: {
    id: string;
    username: string;
    avatarUri?: string;
  };
}
