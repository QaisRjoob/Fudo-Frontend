import * as ImagePicker from 'expo-image-picker';
import { Paths, Directory, File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { MediaItem, MediaType } from '../models';
import { v4 as uuidv4 } from 'uuid';

export class MediaService {
  private static instance: MediaService;
  private cacheDirectory: Directory;
  private maxCacheSizeMB = 500; // 500 MB cache limit

  private constructor() {
    this.cacheDirectory = new Directory(Paths.cache, 'media');
    this.ensureCacheDirectory();
  }

  static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  private async ensureCacheDirectory(): Promise<void> {
    if (!this.cacheDirectory.exists) {
      await this.cacheDirectory.create();
    }
  }

  async requestPermissions(): Promise<boolean> {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return cameraStatus === 'granted' && mediaStatus === 'granted';
  }

  async pickImages(options: { 
    allowsMultipleSelection?: boolean; 
    maxSelection?: number;
  } = {}): Promise<MediaItem[]> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: options.allowsMultipleSelection ?? false,
      quality: 0.8,
      allowsEditing: !options.allowsMultipleSelection,
      aspect: [4, 3],
    });

    if (result.canceled) {
      return [];
    }

    const mediaItems: MediaItem[] = [];
    const assets = result.assets.slice(0, options.maxSelection || 10);

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const thumbnailUri = await this.generateThumbnail(asset.uri);
      
      mediaItems.push({
        id: uuidv4(),
        type: 'image',
        localUri: asset.uri,
        thumbnailUri,
        order: i,
        width: asset.width,
        height: asset.height,
      });
    }

    return mediaItems;
  }

  async pickVideo(): Promise<MediaItem | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    const thumbnailUri = await this.generateVideoThumbnail(asset.uri);

    return {
      id: uuidv4(),
      type: 'video',
      localUri: asset.uri,
      thumbnailUri,
      order: 0,
      width: asset.width,
      height: asset.height,
    };
  }

  async takePhoto(): Promise<MediaItem | null> {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    const thumbnailUri = await this.generateThumbnail(asset.uri);

    return {
      id: uuidv4(),
      type: 'image',
      localUri: asset.uri,
      thumbnailUri,
      order: 0,
      width: asset.width,
      height: asset.height,
    };
  }

  async pickStoryImage(): Promise<MediaItem | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    const thumbnailUri = await this.generateThumbnail(asset.uri);

    return {
      id: uuidv4(),
      type: 'image',
      localUri: asset.uri,
      thumbnailUri,
      order: 0,
      width: asset.width,
      height: asset.height,
    };
  }

  async pickStoryVideo(): Promise<MediaItem | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [9, 16],
      videoMaxDuration: 60,
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    const thumbnailUri = await this.generateVideoThumbnail(asset.uri);

    return {
      id: uuidv4(),
      type: 'video',
      localUri: asset.uri,
      thumbnailUri,
      order: 0,
      width: asset.width,
      height: asset.height,
    };
  }

  async takeStoryPhoto(): Promise<MediaItem | null> {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    const thumbnailUri = await this.generateThumbnail(asset.uri);

    return {
      id: uuidv4(),
      type: 'image',
      localUri: asset.uri,
      thumbnailUri,
      order: 0,
      width: asset.width,
      height: asset.height,
    };
  }

  async generateThumbnail(uri: string, size: number = 300): Promise<string> {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: size } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Save thumbnail to cache
      const filename = `thumb_${uuidv4()}.jpg`;
      const thumbnailFile = new File(this.cacheDirectory, filename);
      
      // Copy the manipulated image to our cache
      const sourceFile = new File(manipResult.uri);
      await sourceFile.copy(thumbnailFile);

      return thumbnailFile.uri;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return uri; // Fallback to original
    }
  }

  async generateVideoThumbnail(uri: string): Promise<string> {
    // For videos, we'd use expo-video-thumbnails or similar
    // For now, return a placeholder or the video URI
    // In production, generate actual video thumbnail
    return uri;
  }

  async cacheMedia(remoteUri: string): Promise<string> {
    try {
      // For now, just return the remote URI
      // In production with a backend, you would download and cache
      return remoteUri;
    } catch (error) {
      console.error('Error caching media:', error);
      return remoteUri; // Fallback to remote URI
    }
  }

  async clearCache(): Promise<void> {
    try {
      if (this.cacheDirectory.exists) {
        await this.cacheDirectory.delete();
        await this.cacheDirectory.create();
      }
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      if (!this.cacheDirectory.exists) return 0;

      const items = this.cacheDirectory.list();
      let totalSize = 0;

      for (const item of items) {
        if (item instanceof File) {
          totalSize += item.size || 0;
        }
      }

      return totalSize / (1024 * 1024); // Convert to MB
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  async enforceCacheLimit(): Promise<void> {
    try {
      const cacheSize = await this.getCacheSize();
      
      if (cacheSize > this.maxCacheSizeMB) {
        if (!this.cacheDirectory.exists) return;

        // Simple LRU: delete oldest files first
        const items = this.cacheDirectory.list();
        const files = items.filter(item => item instanceof File) as File[];

        // Sort by modification time (oldest first)  
        files.sort((a, b) => {
          const aTime = a.modificationTime || 0;
          const bTime = b.modificationTime || 0;
          return aTime - bTime;
        });

        // Delete oldest files until under limit
        let currentSize = cacheSize;
        for (const file of files) {
          if (currentSize <= this.maxCacheSizeMB * 0.8) break; // Keep 80% of limit

          const fileSize = (file.size || 0) / (1024 * 1024);
          await file.delete();
          currentSize -= fileSize;
        }

        console.log('Cache limit enforced, new size:', currentSize, 'MB');
      }
    } catch (error) {
      console.error('Error enforcing cache limit:', error);
    }
  }

  /**
   * Simulates uploading media to a remote server
   * In production, this would make actual API calls
   */
  async uploadMedia(localUri: string, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve) => {
      // Simulate upload with progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.1;
        onProgress?.(Math.min(progress, 1));

        if (progress >= 1) {
          clearInterval(interval);
          // Return a mock remote URI
          const filename = localUri.split('/').pop();
          resolve(`https://cdn.fudo.app/media/${filename}`);
        }
      }, 100);
    });
  }
}

export default MediaService.getInstance();
