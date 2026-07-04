import { makeAutoObservable, runInAction } from 'mobx';
import { Conversation, User } from '../models';
import { ConversationRepository, UserRepository } from '../repositories';
import { AuthService } from '../services/AuthService';

export type ConversationItem = Conversation & { otherUser: User | null };

export class ConversationsViewModel {
  items: ConversationItem[] = [];
  unmessagedFriends: User[] = [];
  isLoading = false;
  isRefreshing = false;
  readonly currentUserId = AuthService.getCurrentUserId();

  private convRepo = new ConversationRepository();
  private userRepo = new UserRepository();

  constructor() { makeAutoObservable(this); }

  async initialize(): Promise<void> {
    runInAction(() => { this.isLoading = true; });
    try {
      await this.fetchAll();
    } catch (e) {
      console.error('ConversationsViewModel.initialize:', e);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async refresh(): Promise<void> {
    runInAction(() => { this.isRefreshing = true; });
    await this.fetchAll();
    runInAction(() => { this.isRefreshing = false; });
  }

  private async fetchAll(): Promise<void> {
    await Promise.all([this.fetchConversations(), this.fetchUnmessagedFriends()]);
  }

  private async fetchConversations(): Promise<void> {
    if (!this.currentUserId) return;
    const convs = await this.convRepo.getConversations(this.currentUserId);
    const items = await Promise.all(
      convs.map(async (conv) => {
        const otherId = conv.participantIds.find(id => id !== this.currentUserId);
        const otherUser = otherId ? await this.userRepo.getUserById(otherId) : null;
        return { ...conv, otherUser };
      })
    );
    runInAction(() => { this.items = items; });
  }

  private async fetchUnmessagedFriends(): Promise<void> {
    if (!this.currentUserId) return;
    const following = await this.userRepo.getFollowing(this.currentUserId);
    const messagedIds = new Set(
      this.items.map(c => c.otherUser?.id).filter(Boolean)
    );
    const friends = following.filter(u => !messagedIds.has(u.id));
    runInAction(() => { this.unmessagedFriends = friends; });
  }

  async startConversation(userId: string): Promise<string> {
    if (!this.currentUserId) throw new Error('Not authenticated');
    const conv = await this.convRepo.getOrCreateConversation([this.currentUserId, userId]);
    return conv.id;
  }
}
