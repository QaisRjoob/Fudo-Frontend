import { makeAutoObservable, runInAction } from 'mobx';
import { PostWithAuthor, User } from '../models';
import { PostRepository, UserRepository } from '../repositories';
import { AuthService } from '../services/AuthService';

export const CATEGORIES = [
  { label: 'All',        emoji: '🍽️' },
  { label: 'Breakfast',  emoji: '🌅' },
  { label: 'Lunch',      emoji: '☀️' },
  { label: 'Dinner',     emoji: '🌙' },
  { label: 'Desserts',   emoji: '🍰' },
  { label: 'Coffee',     emoji: '☕' },
  { label: 'Fast Food',  emoji: '🍔' },
  { label: 'Healthy',    emoji: '🥗' },
  { label: 'Pizza',      emoji: '🍕' },
  { label: 'Noodles',    emoji: '🍜' },
  { label: 'BBQ',        emoji: '🔥' },
  { label: 'Seafood',    emoji: '🦞' },
  { label: 'Vegan',      emoji: '🌿' },
] as const;

export type SearchTab = 'all' | 'people' | 'posts';

export class ExploreViewModel {
  // Browse state
  posts: PostWithAuthor[]     = [];
  selectedCategory: string    = 'All';
  isLoading: boolean          = false;
  isRefreshing: boolean       = false;
  hasMore: boolean            = true;
  isLoadingMore: boolean      = false;

  // Search state
  searchQuery: string         = '';
  isSearchActive: boolean     = false;
  searchTab: SearchTab        = 'all';
  searchUsers: User[]         = [];
  searchPosts: PostWithAuthor[] = [];
  isLoadingSearch: boolean    = false;

  readonly currentUserId = AuthService.getCurrentUserId();
  private postRepo  = new PostRepository();
  private userRepo  = new UserRepository();
  private offset    = 0;
  private readonly PAGE = 30;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() { makeAutoObservable(this); }

  // ── Browse ────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    await this.loadPosts(true);
  }

  async selectCategory(cat: string): Promise<void> {
    if (cat === this.selectedCategory) return;
    runInAction(() => { this.selectedCategory = cat; });
    await this.loadPosts(true);
  }

  async refresh(): Promise<void> {
    await this.loadPosts(true);
  }

  async loadMore(): Promise<void> {
    if (this.isLoadingMore || !this.hasMore || this.isSearchActive) return;
    runInAction(() => { this.isLoadingMore = true; });
    try {
      const more = await this.postRepo.getExplorePosts(
        this.currentUserId ?? '', this.selectedCategory, this.PAGE, this.offset
      );
      runInAction(() => {
        this.posts     = [...this.posts, ...more];
        this.offset   += more.length;
        this.hasMore   = more.length === this.PAGE;
      });
    } catch (e) {
      console.error('ExploreViewModel.loadMore:', e);
    } finally {
      runInAction(() => { this.isLoadingMore = false; });
    }
  }

  private async loadPosts(reset: boolean): Promise<void> {
    runInAction(() => {
      if (reset) { this.isLoading = true; this.offset = 0; this.posts = []; }
      else        { this.isRefreshing = true; }
    });
    try {
      const posts = await this.postRepo.getExplorePosts(
        this.currentUserId ?? '', this.selectedCategory, this.PAGE, 0
      );
      runInAction(() => {
        this.posts   = posts;
        this.offset  = posts.length;
        this.hasMore = posts.length === this.PAGE;
      });
    } catch (e) {
      console.error('ExploreViewModel.loadPosts:', e);
    } finally {
      runInAction(() => { this.isLoading = false; this.isRefreshing = false; });
    }
  }

  // ── Like / Save (optimistic, same as feed) ─────────────────────────────────

  async toggleLike(postId: string): Promise<void> {
    if (!this.currentUserId) return;
    const post = this.posts.find(p => p.id === postId)
              || this.searchPosts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked;
    runInAction(() => { post.isLiked = !wasLiked; post.likesCount += wasLiked ? -1 : 1; });
    try {
      if (wasLiked) await this.postRepo.unlikePost(this.currentUserId, postId);
      else          await this.postRepo.likePost(this.currentUserId, postId);
    } catch {
      runInAction(() => { post.isLiked = wasLiked; post.likesCount += wasLiked ? 1 : -1; });
    }
  }

  async toggleSave(postId: string): Promise<void> {
    if (!this.currentUserId) return;
    const post = this.posts.find(p => p.id === postId)
              || this.searchPosts.find(p => p.id === postId);
    if (!post) return;
    const wasSaved = post.isSaved;
    runInAction(() => { post.isSaved = !wasSaved; });
    try {
      if (wasSaved) await this.postRepo.unsavePost(this.currentUserId, postId);
      else          await this.postRepo.savePost(this.currentUserId, postId);
    } catch {
      runInAction(() => { post.isSaved = wasSaved; });
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  setSearchActive(active: boolean): void {
    this.isSearchActive = active;
    if (!active) { this.searchQuery = ''; this.searchUsers = []; this.searchPosts = []; }
  }

  setSearchTab(tab: SearchTab): void { this.searchTab = tab; }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (!query.trim()) {
      this.searchUsers = [];
      this.searchPosts = [];
      return;
    }
    this.searchTimer = setTimeout(() => this.runSearch(query.trim()), 300);
  }

  private async runSearch(query: string): Promise<void> {
    runInAction(() => { this.isLoadingSearch = true; });
    try {
      const [users, posts] = await Promise.all([
        this.userRepo.searchUsers(query),
        this.postRepo.searchPosts(query, this.currentUserId ?? undefined),
      ]);
      runInAction(() => {
        this.searchUsers = users.filter(u => u.id !== this.currentUserId);
        this.searchPosts = posts;
      });
    } catch (e) {
      console.error('ExploreViewModel.runSearch:', e);
    } finally {
      runInAction(() => { this.isLoadingSearch = false; });
    }
  }

  async followUser(userId: string): Promise<void> {
    if (!this.currentUserId) return;
    const user = this.searchUsers.find(u => u.id === userId);
    if (!user) return;
    runInAction(() => { user.isFollowing = true; });
    try {
      await this.userRepo.followUser(this.currentUserId, userId);
    } catch {
      runInAction(() => { user.isFollowing = false; });
    }
  }
}
