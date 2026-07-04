import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { User, PostWithAuthor, MediaItem } from '../models';
import { StoryRepository } from '../repositories/StoryRepository';
import MediaService from '../services/MediaService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ACCENT = '#FF6B35';

interface Props {
  visible: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
  currentUserId: string;
  currentUser: User | null;
  recentPosts: PostWithAuthor[];
}

type CreatorStep =
  | { type: 'menu' }
  | { type: 'preview'; media: MediaItem }
  | { type: 'share_post' };

const storyRepo = new StoryRepository();

const StoryCreatorScreen: React.FC<Props> = ({
  visible,
  onClose,
  onStoryCreated,
  currentUserId,
  currentUser,
  recentPosts,
}) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<CreatorStep>({ type: 'menu' });
  const [uploading, setUploading] = useState(false);
  const [selectedPostMedia, setSelectedPostMedia] = useState<MediaItem | null>(null);

  const resetAndClose = () => {
    setStep({ type: 'menu' });
    setSelectedPostMedia(null);
    onClose();
  };

  const handlePickImage = async () => {
    try {
      const media = await MediaService.pickStoryImage();
      if (media) {
        setStep({ type: 'preview', media });
      }
    } catch (err) {
      console.error('Error picking story image:', err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const media = await MediaService.takeStoryPhoto();
      if (media) {
        setStep({ type: 'preview', media });
      }
    } catch (err) {
      console.error('Error taking story photo:', err);
    }
  };

  const handlePickVideo = async () => {
    try {
      const media = await MediaService.pickStoryVideo();
      if (media) {
        setStep({ type: 'preview', media });
      }
    } catch (err) {
      console.error('Error picking story video:', err);
    }
  };

  const handleShareToStory = async (media: MediaItem) => {
    setUploading(true);
    try {
      await storyRepo.createStory({
        authorId: currentUserId,
        media,
      });
      onStoryCreated();
      resetAndClose();
    } catch (err) {
      console.error('Error creating story:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectPost = (post: PostWithAuthor) => {
    if (!post.media || post.media.length === 0) return;
    setSelectedPostMedia(post.media[0]);
    setStep({ type: 'preview', media: post.media[0] });
  };

  const renderMenu = () => (
    <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.handle} />
      <Text style={styles.sheetTitle}>Create Story</Text>

      <TouchableOpacity style={styles.optionRow} onPress={handlePickImage}>
        <View style={[styles.optionIcon, { backgroundColor: '#1A1A1A' }]}>
          <Ionicons name="image-outline" size={24} color={ACCENT} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Photo</Text>
          <Text style={styles.optionSubtitle}>Choose from gallery</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionRow} onPress={handleTakePhoto}>
        <View style={[styles.optionIcon, { backgroundColor: '#1A1A1A' }]}>
          <Ionicons name="camera-outline" size={24} color={ACCENT} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Camera</Text>
          <Text style={styles.optionSubtitle}>Take a photo</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionRow} onPress={handlePickVideo}>
        <View style={[styles.optionIcon, { backgroundColor: '#1A1A1A' }]}>
          <Ionicons name="videocam-outline" size={24} color={ACCENT} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Video</Text>
          <Text style={styles.optionSubtitle}>Up to 60 seconds</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => setStep({ type: 'share_post' })}
      >
        <View style={[styles.optionIcon, { backgroundColor: '#1A1A1A' }]}>
          <Ionicons name="grid-outline" size={24} color={ACCENT} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Share Post</Text>
          <Text style={styles.optionSubtitle}>Share one of your recent posts</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={resetAndClose}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPreview = (media: MediaItem) => {
    const isVideo = media.type === 'video';
    const uri = media.localUri || media.remoteUri || '';

    return (
      <View style={styles.previewContainer}>
        {isVideo ? (
          <Video
            source={{ uri }}
            style={styles.previewMedia}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay
            isMuted
          />
        ) : (
          <Image
            source={{ uri }}
            style={styles.previewMedia}
            resizeMode="contain"
          />
        )}

        {/* Close button */}
        <TouchableOpacity
          style={[styles.previewClose, { top: insets.top + 12 }]}
          onPress={() => setStep({ type: 'menu' })}
        >
          <Ionicons name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>

        {/* Share button */}
        <View style={[styles.previewActions, { paddingBottom: insets.bottom + 20 }]}>
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShareToStory(media)}
            >
              <Text style={styles.shareButtonText}>Share to Story</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSharePost = () => {
    const ownPosts = recentPosts.filter(p => p.authorId === currentUserId);

    return (
      <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <View style={styles.sharePostHeader}>
          <TouchableOpacity onPress={() => setStep({ type: 'menu' })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>Share Post</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={styles.sharePostSubtitle}>Tap a post to share it to your story</Text>

        {ownPosts.length === 0 ? (
          <View style={styles.noPostsContainer}>
            <Ionicons name="grid-outline" size={40} color="#555" />
            <Text style={styles.noPostsText}>No posts to share yet</Text>
          </View>
        ) : (
          <FlatList
            data={ownPosts}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.postsRow}
            renderItem={({ item: post }) => {
              const thumbUri =
                post.media?.[0]?.thumbnailUri ||
                post.media?.[0]?.localUri ||
                post.media?.[0]?.remoteUri ||
                '';
              return (
                <TouchableOpacity
                  style={styles.postThumb}
                  onPress={() => handleSelectPost(post)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: thumbUri }}
                    style={styles.postThumbImage}
                    resizeMode="cover"
                  />
                  {post.media?.[0]?.type === 'video' && (
                    <View style={styles.videoOverlay}>
                      <Ionicons name="play" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={resetAndClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      {step.type === 'preview' ? (
        renderPreview(step.media)
      ) : (
        <>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={resetAndClose}
          />
          {step.type === 'menu' && renderMenu()}
          {step.type === 'share_post' && renderSharePost()}
        </>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  sheetTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,128,0.15)',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  previewClose: {
    position: 'absolute',
    left: 16,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  uploadingText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  sharePostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sharePostSubtitle: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  postsRow: {
    paddingVertical: 8,
    gap: 10,
  },
  postThumb: {
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  postThumbImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  noPostsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noPostsText: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
  },
});

export default StoryCreatorScreen;
