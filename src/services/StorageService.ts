import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error setting object ${key}:`, error);
      throw error;
    }
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error getting object ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // Auth-specific methods
  async setAuthToken(token: string): Promise<void> {
    await this.setItem('auth_token', token);
  }

  async getAuthToken(): Promise<string | null> {
    return this.getItem('auth_token');
  }

  async removeAuthToken(): Promise<void> {
    await this.removeItem('auth_token');
  }

  async setCurrentUserId(userId: string): Promise<void> {
    await this.setItem('current_user_id', userId);
  }

  async getCurrentUserId(): Promise<string | null> {
    return this.getItem('current_user_id');
  }

  // Onboarding
  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await this.setItem('onboarding_completed', completed.toString());
  }

  async isOnboardingCompleted(): Promise<boolean> {
    const value = await this.getItem('onboarding_completed');
    return value === 'true';
  }

  // Settings
  async saveSettings(settings: Record<string, any>): Promise<void> {
    await this.setObject('app_settings', settings);
  }

  async getSettings(): Promise<Record<string, any> | null> {
    return this.getObject('app_settings');
  }

  // Draft posts
  async saveDraft(draft: any): Promise<void> {
    const drafts = await this.getDrafts();
    drafts.push(draft);
    await this.setObject('post_drafts', drafts);
  }

  async getDrafts(): Promise<any[]> {
    const drafts = await this.getObject<any[]>('post_drafts');
    return drafts || [];
  }

  async removeDraft(draftId: string): Promise<void> {
    const drafts = await this.getDrafts();
    const filtered = drafts.filter(d => d.id !== draftId);
    await this.setObject('post_drafts', filtered);
  }
}

export default StorageService.getInstance();
