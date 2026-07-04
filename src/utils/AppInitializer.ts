import DatabaseService from '../db/database';
import SeedData from '../db/seedData';
import StorageService from '../services/StorageService';
import { AuthService } from '../services/AuthService';

export class AppInitializer {
  private static instance: AppInitializer;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AppInitializer {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer();
    }
    return AppInitializer.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Fudo App...');

      // Initialize database
      console.log('📦 Setting up database...');
      await DatabaseService.initializeDatabase();

      // Reseed when seed version changes
      const seededVersion = await StorageService.getItem('app_seed_version');
      const CURRENT_SEED_VERSION = '5';

      if (seededVersion !== CURRENT_SEED_VERSION) {
        console.log('🌱 Seeding database (version', CURRENT_SEED_VERSION, ')...');
        await SeedData.clearAndSeed();
        await StorageService.setItem('app_seed_version', CURRENT_SEED_VERSION);
        await StorageService.setItem('app_initialized', 'true');
        await StorageService.setCurrentUserId('current-user');
      }

      // Restore persisted auth session into AuthService memory (survives app reloads)
      await AuthService.restorePersistedSession();

      // Ensure demo fallback user exists in storage for UserRepository
      const currentUserId = await StorageService.getCurrentUserId();
      if (!currentUserId) {
        await StorageService.setCurrentUserId('current-user');
      }

      console.log('✅ App initialized successfully!');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    console.log('🔄 Resetting app data...');
    await SeedData.clearAndSeed();
    await StorageService.clear();
    await StorageService.setItem('app_initialized', 'true');
    await StorageService.setCurrentUserId('current-user');
    this.isInitialized = false;
    await this.initialize();
    console.log('✅ App reset complete!');
  }
}

export default AppInitializer.getInstance();
