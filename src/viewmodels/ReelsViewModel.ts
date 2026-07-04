import { makeAutoObservable, runInAction } from 'mobx';
import { PostWithAuthor } from '../models';
import { PostRepository, UserRepository } from '../repositories';
import { AuthService } from '../services/AuthService';

export class ReelsViewModel {
  posts: PostWithAuthor[] = [];
  isLoading = false;
  hasMore = true;
  isLoadingMore = false;

  readonly currentUserId = AuthService.getCurrentUserId();
  private postRepo = new PostRepository();
  private userRepo = new UserRepository();
  private offset = 0;
  private readonly PAGE = 10;

  constructor() { makeAutoObservable(this); }

  async initialize(): Promise<void> {
    if (this.posts.length > 0) return;
    await this.loadReels(true);
  }

  async refresh(): Promise<void> {
    await this.loadReels(true);
  }

  async loadMore(): Promise<void> {
    if (this.isLoadingMore || !this.hasMore) return;
    runInAction(() => { this.isLoadingMore = true; });
    try {
      const more = await this.postRepo.getReels(
        this.currentUserId ?? '', this.PAGE, this.offset
      );
      runInAction(() => {
        this.posts = [...this.posts, ...more];
        this.offset += more.length;
        this.hasMore = more.length === this.PAGE;
      });
    } catch (e) {
      console.error('ReelsViewModel.loadMore:', e);
    } finally {
      runInAction(() => { this.isLoadingMore = false; });
    }
  }

  private async loadReels(reset: boolean): Promise<void> {
    runInAction(() => {
      this.isLoading = true;
      if (reset) { this.offset = 0; this.posts = []; }
    });
    try {
      const posts = await this.postRepo.getReels(
        this.currentUserId ?? '', this.PAGE, 0
      );
      runInAction(() => {
        this.posts = posts;
        this.offset = posts.length;
        this.hasMore = posts.length === this.PAGE;
      });
    } catch (e) {
      console.error('ReelsViewModel.loadReels:', e);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async toggleLike(postId: string): Promise<void> {
    if (!this.currentUserId) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked;
    runInAction(() => { post.isLiked = !wasLiked; post.likesCount += wasLiked ? -1 : 1; });
    try {
      if (wasLiked) await this.postRepo.unlikePost(this.currentUserId, postId);
      else await this.postRepo.likePost(this.currentUserId, postId);
    } catch {
      runInAction(() => { post.isLiked = wasLiked; post.likesCount += wasLiked ? 1 : -1; });
    }
  }

  async toggleSave(postId: string): Promise<void> {
    if (!this.currentUserId) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    const wasSaved = post.isSaved;
    runInAction(() => { post.isSaved = !wasSaved; });
    try {
      if (wasSaved) await this.postRepo.unsavePost(this.currentUserId, postId);
      else await this.postRepo.savePost(this.currentUserId, postId);
    } catch {
      runInAction(() => { post.isSaved = wasSaved; });
    }
  }

  async followUser(userId: string): Promise<void> {
    if (!this.currentUserId) return;
    const post = this.posts.find(p => p.author?.id === userId);
    if (!post?.author) return;
    const wasFollowing = post.author.isFollowing;
    runInAction(() => { post.author!.isFollowing = true; });
    try {
      await this.userRepo.followUser(this.currentUserId, userId);
    } catch {
      runInAction(() => { post.author!.isFollowing = wasFollowing; });
    }
  }
}
