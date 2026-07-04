import { makeAutoObservable, runInAction } from 'mobx';
import { User, PostWithAuthor, UserAnalytics } from '../models';
import { UserRepository, PostRepository, AnalyticsRepository } from '../repositories';

export class ProfileViewModel {
  user: User | null = null;
  posts: PostWithAuthor[] = [];
  analytics: UserAnalytics | null = null;
  isLoading: boolean = false;
  isFollowing: boolean = false;
  error: string | null = null;
  selectedPeriod: '7d' | '30d' | '90d' = '30d';
  currentUserId: string | null = null;

  private userRepo: UserRepository;
  private postRepo: PostRepository;
  private analyticsRepo: AnalyticsRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.postRepo = new PostRepository();
    this.analyticsRepo = new AnalyticsRepository();

    makeAutoObservable(this);
  }

  get isCurrentUser(): boolean {
    return (
      this.currentUserId !== null &&
      this.user !== null &&
      this.currentUserId === this.user.id
    );
  }

  async initialize(userId?: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      // Resolve current logged-in user first
      const currentUser = await this.userRepo.getCurrentUser();
      runInAction(() => {
        this.currentUserId = currentUser?.id ?? null;
      });

      // Load the profile user (own profile if no userId given)
      const user = userId
        ? await this.userRepo.getUserById(userId)
        : currentUser;

      if (user) {
        runInAction(() => {
          this.user = user;
        });

        await Promise.all([
          this.loadPosts(),
          this.loadAnalytics(),
          this.checkFollowStatus(),
        ]);
      }
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to load profile';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  private async loadPosts(): Promise<void> {
    if (!this.user) return;

    try {
      const posts = await this.postRepo.getUserPosts(this.user.id, this.currentUserId ?? this.user.id);
      runInAction(() => {
        this.posts = posts;
      });
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }

  async loadAnalytics(period?: '7d' | '30d' | '90d'): Promise<void> {
    if (!this.user) return;

    if (period) {
      runInAction(() => {
        this.selectedPeriod = period;
      });
    }

    try {
      const analytics = await this.analyticsRepo.getUserAnalytics(
        this.user.id,
        period ?? this.selectedPeriod
      );

      runInAction(() => {
        this.analytics = analytics;
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  private async checkFollowStatus(): Promise<void> {
    if (!this.user || !this.currentUserId) return;
    if (this.currentUserId === this.user.id) return;

    try {
      const following = await this.userRepo.isFollowing(this.currentUserId, this.user.id);
      runInAction(() => {
        this.isFollowing = following;
      });
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  }

  async toggleFollow(): Promise<void> {
    if (!this.user || !this.currentUserId) return;

    const wasFollowing = this.isFollowing;
    runInAction(() => {
      this.isFollowing = !wasFollowing;
      if (this.user) {
        this.user.followersCount += wasFollowing ? -1 : 1;
      }
    });

    try {
      if (wasFollowing) {
        await this.userRepo.unfollowUser(this.currentUserId, this.user.id);
      } else {
        await this.userRepo.followUser(this.currentUserId, this.user.id);
      }
    } catch (error) {
      runInAction(() => {
        this.isFollowing = wasFollowing;
        if (this.user) {
          this.user.followersCount += wasFollowing ? 1 : -1;
        }
      });
      console.error('Error toggling follow:', error);
    }
  }

  async toggleLike(postId: string): Promise<void> {
    if (!this.currentUserId) return;

    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;
    runInAction(() => {
      post.isLiked = !wasLiked;
      post.likesCount += wasLiked ? -1 : 1;
    });

    try {
      if (wasLiked) {
        await this.postRepo.unlikePost(this.currentUserId, postId);
      } else {
        await this.postRepo.likePost(this.currentUserId, postId);
      }
    } catch (error) {
      runInAction(() => {
        post.isLiked = wasLiked;
        post.likesCount += wasLiked ? 1 : -1;
      });
      console.error('Error toggling like:', error);
    }
  }

  async toggleSave(postId: string): Promise<void> {
    if (!this.currentUserId) return;

    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const wasSaved = post.isSaved;
    runInAction(() => {
      post.isSaved = !wasSaved;
    });

    try {
      if (wasSaved) {
        await this.postRepo.unsavePost(this.currentUserId, postId);
      } else {
        await this.postRepo.savePost(this.currentUserId, postId);
      }
    } catch (error) {
      runInAction(() => {
        post.isSaved = wasSaved;
      });
      console.error('Error toggling save:', error);
    }
  }

  async refresh(): Promise<void> {
    await this.initialize(this.user?.id);
  }
}
