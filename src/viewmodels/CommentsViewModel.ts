import { makeAutoObservable, runInAction } from 'mobx';
import { CommentWithAuthor } from '../models';
import { CommentRepository } from '../repositories';
import { AuthService } from '../services/AuthService';

export class CommentsViewModel {
  comments: CommentWithAuthor[] = [];
  inputText: string = '';
  replyTo: CommentWithAuthor | null = null;
  isLoading: boolean = false;
  isSending: boolean = false;
  error: string | null = null;

  private postId: string = '';
  private commentRepo = new CommentRepository();

  constructor() {
    makeAutoObservable(this);
  }

  async initialize(postId: string): Promise<void> {
    this.postId = postId;
    await this.loadComments();
  }

  async loadComments(): Promise<void> {
    const userId = AuthService.getCurrentUserId() ?? undefined;
    runInAction(() => { this.isLoading = true; this.error = null; });
    try {
      const comments = await this.commentRepo.getPostComments(this.postId, userId);
      runInAction(() => { this.comments = comments; });
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to load comments'; });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  setInputText(text: string): void { this.inputText = text; }

  setReplyTo(comment: CommentWithAuthor | null): void {
    this.replyTo = comment;
    if (comment) this.inputText = `@${comment.author?.username ?? ''} `;
    else this.inputText = '';
  }

  async sendComment(): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    const text = this.inputText.trim();
    if (!userId || !text) return;

    runInAction(() => { this.isSending = true; this.error = null; });
    try {
      const comment = await this.commentRepo.createComment({
        postId: this.postId,
        authorId: userId,
        text,
        replyToCommentId: this.replyTo?.id,
      });
      runInAction(() => {
        this.comments.push(comment);
        this.inputText = '';
        this.replyTo = null;
      });
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to send comment'; });
    } finally {
      runInAction(() => { this.isSending = false; });
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    try {
      await this.commentRepo.deleteComment(commentId);
      runInAction(() => {
        this.comments = this.comments.filter(c => c.id !== commentId);
      });
    } catch (e: any) {
      runInAction(() => { this.error = e.message; });
    }
  }

  async toggleLike(commentId: string): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    const comment = this.comments.find(c => c.id === commentId);
    if (!comment) return;
    const wasLiked = comment.isLiked;
    runInAction(() => {
      comment.isLiked = !wasLiked;
      comment.likesCount += wasLiked ? -1 : 1;
    });
    try {
      if (wasLiked) await this.commentRepo.unlikeComment(userId, commentId);
      else await this.commentRepo.likeComment(userId, commentId);
    } catch {
      runInAction(() => {
        comment.isLiked = wasLiked;
        comment.likesCount += wasLiked ? 1 : -1;
      });
    }
  }

  get currentUserId(): string | null {
    return AuthService.getCurrentUserId();
  }
}
