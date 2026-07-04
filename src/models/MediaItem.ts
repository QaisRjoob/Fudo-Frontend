export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  type: MediaType;
  remoteUri?: string;
  localUri?: string; // cached file path or upload temp path
  thumbnailUri?: string;
  order: number;
  width?: number;
  height?: number;
}
