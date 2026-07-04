import { makeAutoObservable, runInAction } from 'mobx';
import { PostWithAuthor, User, StoryGroup } from '../models';
import { PostRepository, UserRepository, AnalyticsRepository, StoryRepository } from '../repositories';
import { StorageService } from '../services/StorageService';

const SUGGESTED_PAGE_SIZE = 5;

export class FeedViewModel {
  posts: PostWithAuthor[] = [];
  suggestedUsers: User[] = [];
  suggestedHasMore: boolean = true;
  suggestedLoading: boolean = false;
  isLoading: boolean = false;
  isRefreshing: boolean = false;
  hasMore: boolean = true;
  error: string | null = null;
  currentUser: User | null = null;
  storyGroups: StoryGroup[] = [];
  viewedGroupAuthorIds: string[] = [];

  private postRepo: PostRepository;
  private userRepo: UserRepository;
  private analyticsRepo: AnalyticsRepository;
  private storyRepo: StoryRepository;
  private storage = StorageService.getInstance();
  private seenStoryIds: Set<string> = new Set();
  private cursor?: string;
  private suggestedOffset: number = 0;

  constructor() {
    this.postRepo = new PostRepository();
    this.userRepo = new UserRepository();
    this.analyticsRepo = new AnalyticsRepository();
    this.storyRepo = new StoryRepository();

    makeAutoObservable(this);
  }

  async initialize(): Promise<void> {
    await this.loadCurrentUser();
    await this.loadSeenStoryIds();
    await Promise.all([
      this.loadFeed(),
      this.loadSuggestedUsers(),
      this.loadStories(),
    ]);
  }

  private async loadSeenStoryIds(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const raw = await this.storage.getItem(`seen_stories_${this.currentUser.id}`);
      if (raw) {
        this.seenStoryIds = new Set(JSON.parse(raw) as string[]);
      }
    } catch {}
  }

  private async saveSeenStoryIds(): Promise<void> {
    if (!this.currentUser) return;
    try {
      await this.storage.setItem(
        `seen_stories_${this.currentUser.id}`,
        JSON.stringify([...this.seenStoryIds])
      );
    } catch {}
  }

  async loadStories(): Promise<void> {
    if (!this.currentUser) return;

    try {
      const grouped = await this.storyRepo.getActiveStoriesGrouped(this.currentUser.id);

      const storyGroups: StoryGroup[] = [];

      for (const group of grouped) {
        const author = await this.userRepo.getUserById(group.authorId);
        if (!author) continue;

        const hasUnseen =
          group.authorId !== this.currentUser.id &&
          group.stories.some(s => !this.seenStoryIds.has(s.id));

        storyGroups.push({
          authorId: group.authorId,
          author,
          stories: group.stories,
          hasUnseen,
        });
      }

      // Rebuild viewedGroupAuthorIds: groups where every story has been seen
      const viewedIds = storyGroups
        .filter(g => g.stories.length > 0 && g.stories.every(s => this.seenStoryIds.has(s.id)))
        .map(g => g.authorId);

      runInAction(() => {
        this.storyGroups = storyGroups;
        this.viewedGroupAuthorIds = viewedIds;
      });
    } catch (error) {
      console.error('[FeedViewModel] Error loading stories:', error);
    }
  }

  async refreshStories(): Promise<void> {
    await this.loadStories();
  }

  markGroupViewed(authorId: string): void {
    const group = this.storyGroups.find(g => g.authorId === authorId);
    if (group) {
      for (const story of group.stories) {
        this.seenStoryIds.add(story.id);
      }
      this.saveSeenStoryIds();
      runInAction(() => {
        group.hasUnseen = false;
        if (!this.viewedGroupAuthorIds.includes(authorId)) {
          this.viewedGroupAuthorIds.push(authorId);
        }
      });
    }
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const user = await this.userRepo.getCurrentUser();
      runInAction(() => {
        this.currentUser = user;
      });
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  async loadSuggestedUsers(): Promise<void> {
    if (!this.currentUser) return;

    runInAction(() => {
      this.suggestedOffset = 0;
      this.suggestedHasMore = true;
    });

    try {
      const users = await this.userRepo.getSuggestedUsers(this.currentUser.id, SUGGESTED_PAGE_SIZE, 0);
      runInAction(() => {
        this.suggestedUsers = users;
        this.suggestedOffset = users.length;
        this.suggestedHasMore = users.length === SUGGESTED_PAGE_SIZE;
      });
    } catch (error) {
      console.error('Error loading suggested users:', error);
    }
  }

  async loadFeed(isRefresh: boolean = false): Promise<void> {
    if (!this.currentUser) return;

    if (isRefresh) {
      runInAction(() => {
        this.isRefreshing = true;
        this.cursor = undefined;
      });
    } else {
      runInAction(() => {
        this.isLoading = true;
      });
    }

    try {
      const newPosts = await this.postRepo.getFeed(
        this.currentUser.id,
        isRefresh ? undefined : this.cursor,
        20
      );

      runInAction(() => {
        if (isRefresh) {
          this.posts = newPosts;
        } else {
          const existingIds = new Set(this.posts.map(p => p.id));
          const unique = newPosts.filter(p => !existingIds.has(p.id));
          this.posts = [...this.posts, ...unique];
        }

        this.hasMore = newPosts.length >= 20;
        // Use a composite cursor (createdAt + id) to avoid duplicate-timestamp issues
        this.cursor = newPosts.length > 0 ? newPosts[newPosts.length - 1].createdAt : undefined;
        this.error = null;
      });

      // Track impressions — failures must not break feed loading
      try {
        for (const post of newPosts) {
          await this.analyticsRepo.trackEvent({
            entityType: 'post',
            entityId: post.id,
            eventType: 'impression',
            userId: this.currentUser.id,
          });
        }
      } catch (analyticsError) {
        console.warn('[FeedViewModel] Analytics tracking failed (non-fatal):', analyticsError);
      }
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to load feed';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
        this.isRefreshing = false;
      });
    }
  }

  hidePost(postId: string): void {
    runInAction(() => {
      this.posts = this.posts.filter(p => p.id !== postId);
    });
  }

  async toggleLike(postId: string): Promise<void> {
    if (!this.currentUser) return;

    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;
    runInAction(() => {
      post.isLiked = !wasLiked;
      post.likesCount += wasLiked ? -1 : 1;
    });

    try {
      if (wasLiked) {
        await this.postRepo.unlikePost(this.currentUser.id, postId);
      } else {
        await this.postRepo.likePost(this.currentUser.id, postId);
        try {
          await this.analyticsRepo.trackEvent({
            entityType: 'post',
            entityId: postId,
            eventType: 'like',
            userId: this.currentUser.id,
          });
        } catch (_) {}
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
    if (!this.currentUser) return;

    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const wasSaved = post.isSaved;
    runInAction(() => {
      post.isSaved = !wasSaved;
    });

    try {
      if (wasSaved) {
        await this.postRepo.unsavePost(this.currentUser.id, postId);
      } else {
        await this.postRepo.savePost(this.currentUser.id, postId);
        try {
          await this.analyticsRepo.trackEvent({
            entityType: 'post',
            entityId: postId,
            eventType: 'save',
            userId: this.currentUser.id,
          });
        } catch (_) {}
      }
    } catch (error) {
      runInAction(() => {
        post.isSaved = wasSaved;
      });
      console.error('Error toggling save:', error);
    }
  }

  async loadMoreSuggested(): Promise<void> {
    if (!this.currentUser || !this.suggestedHasMore || this.suggestedLoading) return;

    runInAction(() => { this.suggestedLoading = true; });
    try {
      const more = await this.userRepo.getSuggestedUsers(
        this.currentUser.id, SUGGESTED_PAGE_SIZE, this.suggestedOffset
      );
      runInAction(() => {
        this.suggestedUsers = [...this.suggestedUsers, ...more];
        this.suggestedOffset += more.length;
        this.suggestedHasMore = more.length === SUGGESTED_PAGE_SIZE;
      });
    } catch (error) {
      console.error('Error loading more suggested users:', error);
    } finally {
      runInAction(() => { this.suggestedLoading = false; });
    }
  }

  async followUser(userId: string): Promise<void> {
    if (!this.currentUser) return;

    const user = this.suggestedUsers.find(u => u.id === userId);
    if (!user) return;

    // Optimistic update
    runInAction(() => {
      user.isFollowing = true;
    });

    try {
      await this.userRepo.followUser(this.currentUser.id, userId);
      // Refresh feed to include this user's posts, and update suggestion list
      await Promise.all([
        this.loadFeed(true),
        this.loadSuggestedUsers(),
      ]);
    } catch (error) {
      runInAction(() => {
        user.isFollowing = false;
      });
      console.error('Error following user:', error);
    }
  }

  async refresh(): Promise<void> {
    await this.loadCurrentUser();
    await Promise.all([
      this.loadFeed(true),
      this.loadSuggestedUsers(),
    ]);
  }

  async loadMore(): Promise<void> {
    if (!this.isLoading && this.hasMore) {
      await this.loadFeed(false);
    }
  }
}
