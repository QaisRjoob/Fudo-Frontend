import { makeAutoObservable, runInAction } from 'mobx';
import { Conversation, Message, User } from '../models';
import { ConversationRepository, UserRepository } from '../repositories';

export class ChatViewModel {
  conversation: Conversation | null = null;
  messages: Message[] = [];
  isLoading: boolean = false;
  isSending: boolean = false;
  error: string | null = null;
  otherUser: User | null = null;

  private conversationRepo: ConversationRepository;
  private userRepo: UserRepository;

  constructor() {
    this.conversationRepo = new ConversationRepository();
    this.userRepo = new UserRepository();
    
    makeAutoObservable(this);
  }

  async initialize(conversationId?: string, userId?: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      let conv: Conversation | null = null;

      if (conversationId) {
        conv = await this.conversationRepo.getConversationById(conversationId);
      } else if (userId) {
        const currentUser = await this.userRepo.getCurrentUser();
        if (currentUser) {
          conv = await this.conversationRepo.getOrCreateConversation([currentUser.id, userId]);
        }
      }

      if (conv) {
        runInAction(() => {
          this.conversation = conv;
        });

        await this.loadMessages();
        await this.loadOtherUser();
        await this.markAsRead();
      }
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to load conversation';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  private async loadMessages(): Promise<void> {
    if (!this.conversation) return;

    try {
      const messages = await this.conversationRepo.getMessages(this.conversation.id);
      
      runInAction(() => {
        this.messages = messages;
      });
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  }

  private async loadOtherUser(): Promise<void> {
    if (!this.conversation) return;

    try {
      const currentUser = await this.userRepo.getCurrentUser();
      if (!currentUser) return;

      const otherUserId = this.conversation.participantIds.find(id => id !== currentUser.id);
      if (otherUserId) {
        const user = await this.userRepo.getUserById(otherUserId);
        runInAction(() => {
          this.otherUser = user;
        });
      }
    } catch (error) {
      console.error('Error loading other user:', error);
    }
  }

  async sendMessage(text: string, replyToMessageId?: string): Promise<void> {
    if (!this.conversation || !text.trim()) return;

    const currentUser = await this.userRepo.getCurrentUser();
    if (!currentUser) return;

    runInAction(() => { this.isSending = true; });

    try {
      const message = await this.conversationRepo.sendMessage({
        conversationId: this.conversation.id,
        senderId: currentUser.id,
        text: text.trim(),
        replyToMessageId,
      });

      runInAction(() => { this.messages = [...this.messages, message]; });

      // Simulate delivery confirmation after a short delay.
      // SOCKET.IO INTEGRATION POINT:
      //   Replace this block with:
      //     socket.emit('message:send', { conversationId, text, senderId, replyToMessageId })
      //   And listen for delivery receipt:
      //     socket.on('message:delivered', ({ messageId }) => this.updateLocalStatus(messageId, 'delivered'))
      //     socket.on('message:read',      ({ messageId }) => this.updateLocalStatus(messageId, 'read'))
      setTimeout(async () => {
        await this.conversationRepo.updateMessageStatus(message.id, 'sent');
        await this.loadMessages();
      }, 800);
    } catch (error: any) {
      runInAction(() => { this.error = error.message || 'Failed to send message'; });
    } finally {
      runInAction(() => { this.isSending = false; });
    }
  }

  // Convenience wrapper used by ChatScreen for replies.
  async sendMessageWithReply(text: string, replyToMessageId: string): Promise<void> {
    return this.sendMessage(text, replyToMessageId);
  }

  async sendSharedPost(postId: string, text?: string): Promise<void> {
    if (!this.conversation) return;

    const currentUser = await this.userRepo.getCurrentUser();
    if (!currentUser) return;

    runInAction(() => { this.isSending = true; });

    try {
      const message = await this.conversationRepo.sendMessage({
        conversationId: this.conversation.id,
        senderId: currentUser.id,
        text: text?.trim() || undefined,
        sharedPostId: postId,
      });

      runInAction(() => { this.messages = [...this.messages, message]; });

      setTimeout(async () => {
        await this.conversationRepo.updateMessageStatus(message.id, 'sent');
        await this.loadMessages();
      }, 800);
    } catch (error: any) {
      runInAction(() => { this.error = error.message || 'Failed to send post'; });
    } finally {
      runInAction(() => { this.isSending = false; });
    }
  }

  // SOCKET.IO INTEGRATION POINT:
  //   Call this when socket.on('message:new', handler) fires to push incoming messages.
  onIncomingMessage(message: Message): void {
    runInAction(() => { this.messages = [...this.messages, message]; });
  }

  // SOCKET.IO INTEGRATION POINT:
  //   Call this when socket.on('typing:start') / socket.on('typing:stop') fires.
  // otherUserTyping = false;
  // setOtherUserTyping(value: boolean): void { runInAction(() => { this.otherUserTyping = value; }); }

  async editMessage(messageId: string, newText: string): Promise<void> {
    try {
      await this.conversationRepo.editMessage(messageId, newText);
      await this.loadMessages();
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to edit message';
      });
    }
  }

  async unsendMessage(messageId: string): Promise<void> {
    try {
      await this.conversationRepo.unsendMessage(messageId);
      await this.loadMessages();
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to unsend message';
      });
    }
  }

  private async markAsRead(): Promise<void> {
    if (!this.conversation) return;

    try {
      await this.conversationRepo.markConversationAsRead(this.conversation.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }
}
