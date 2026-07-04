import { makeAutoObservable, runInAction } from 'mobx';
import * as ImagePicker from 'expo-image-picker';
import { UserRepository } from '../repositories';
import { AuthService } from '../services/AuthService';
import { SocialLinks } from '../models';

export class EditProfileViewModel {
  displayName: string = '';
  username: string = '';
  bio: string = '';
  avatarUri: string = '';
  socialLinks: SocialLinks = {};

  isLoading: boolean = false;
  isSaving: boolean = false;
  isDeleting: boolean = false;
  error: string | null = null;

  private userRepo: UserRepository;
  private userId: string | null = null;

  constructor() {
    this.userRepo = new UserRepository();
    makeAutoObservable(this);
  }

  async initialize(): Promise<void> {
    runInAction(() => { this.isLoading = true; this.error = null; });
    try {
      this.userId = AuthService.getCurrentUserId();
      if (!this.userId) return;
      const user = await this.userRepo.getUserById(this.userId);
      if (user) {
        runInAction(() => {
          this.displayName = user.displayName || '';
          this.username    = user.username    || '';
          this.bio         = user.bio         || '';
          this.avatarUri   = user.avatarUri   || '';
          this.socialLinks = user.socialLinks || {};
        });
      }
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to load profile'; });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  setDisplayName(value: string) { this.displayName = value; }
  setUsername(value: string)    { this.username    = value; }
  setBio(value: string)         { this.bio         = value; }

  setSocialLink(platform: keyof SocialLinks, value: string) {
    this.socialLinks = { ...this.socialLinks, [platform]: value };
  }

  async pickAvatar(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      runInAction(() => { this.avatarUri = result.assets[0].uri; });
    }
  }

  async save(): Promise<boolean> {
    if (!this.userId) return false;
    if (!this.username.trim()) {
      runInAction(() => { this.error = 'Username is required'; });
      return false;
    }
    runInAction(() => { this.isSaving = true; this.error = null; });
    try {
      const cleanLinks: SocialLinks = {};
      for (const [k, v] of Object.entries(this.socialLinks)) {
        if (v && v.trim()) cleanLinks[k as keyof SocialLinks] = v.trim();
      }
      await this.userRepo.updateUser({
        id: this.userId,
        displayName:  this.displayName.trim() || undefined,
        username:     this.username.trim(),
        bio:          this.bio.trim(),
        avatarUri:    this.avatarUri || undefined,
        socialLinks:  cleanLinks,
      });
      return true;
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to save changes'; });
      return false;
    } finally {
      runInAction(() => { this.isSaving = false; });
    }
  }

  async deleteAccount(): Promise<boolean> {
    if (!this.userId) return false;
    runInAction(() => { this.isDeleting = true; this.error = null; });
    try {
      const db = (this.userRepo as any).db;
      const database = await db.getDatabase();
      await database.runAsync('DELETE FROM users WHERE id = ?', [this.userId]);
      await AuthService.logout();
      return true;
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to delete account'; this.isDeleting = false; });
      return false;
    }
  }
}
