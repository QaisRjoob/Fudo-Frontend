import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StoryGroup } from '../models/Story';
import { StoryRepository } from '../repositories/StoryRepository';
import DefaultAvatar from '../components/DefaultAvatar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ACCENT = '#FF6B35';
const TICK_MS = 50;
const IMAGE_DURATION_MS = 10000;

interface Props {
  groups: StoryGroup[];
  initialGroupIndex: number;
  currentUserId: string | null;
  onClose: () => void;
  onAddStory?: () => void;
}

const storyRepo = new StoryRepository();

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const StoryViewerScreen: React.FC<Props> = ({
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onAddStory,
}) => {
  const insets = useSafeAreaInsets();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // For video: track duration so we can compute elapsed
  const videoDurationRef = useRef<number>(IMAGE_DURATION_MS);
  const videoRef = useRef<Video>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const longPressRef = useRef(false);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isVideo = currentStory?.media?.type === 'video';
  const isOwnStory = currentGroup?.authorId === currentUserId;

  // ─── Navigation helpers ───────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      setElapsed(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
      setElapsed(0);
    } else {
      onClose();
    }
  }, [groupIndex, storyIndex, currentGroup, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (!currentGroup) return;

    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setElapsed(0);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(prev => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setElapsed(0);
    }
    // If already at very first story, do nothing
  }, [groupIndex, storyIndex, currentGroup, groups]);

  // ─── Increment views when story changes ──────────────────────────────────

  useEffect(() => {
    if (currentStory) {
      storyRepo.incrementViews(currentStory.id).catch(() => {});
    }
  }, [currentStory?.id]);

  // ─── Interval-based progress for image stories ──────────────────────────

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isVideo) return; // video uses onPlaybackStatusUpdate

    const duration = IMAGE_DURATION_MS;
    intervalRef.current = setInterval(() => {
      if (longPressRef.current) return;
      setElapsed(prev => {
        const next = prev + TICK_MS / duration;
        if (next >= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          goNext();
          return 1;
        }
        return next;
      });
    }, TICK_MS);
  }, [isVideo, goNext]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start/stop interval when story changes or pause state changes
  useEffect(() => {
    if (isPaused || isVideo) {
      stopInterval();
    } else {
      setElapsed(0);
      startInterval();
    }

    return () => stopInterval();
  }, [currentStory?.id, isPaused, isVideo]);

  // When navigating between stories, reset video duration assumption
  useEffect(() => {
    videoDurationRef.current = IMAGE_DURATION_MS;
    setElapsed(0);
  }, [currentStory?.id]);

  // ─── Video playback status callback ─────────────────────────────────────

  const handlePlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;

      if (status.durationMillis && status.durationMillis > 0) {
        videoDurationRef.current = status.durationMillis;
      }

      if (status.durationMillis && status.durationMillis > 0) {
        const progress =
          (status.positionMillis || 0) / status.durationMillis;
        setElapsed(Math.min(progress, 1));
      }

      if (status.didJustFinish) {
        goNext();
      }
    },
    [goNext]
  );

  // ─── Reply send ──────────────────────────────────────────────────────────

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentUserId || !currentStory) return;
    setSendingReply(true);
    try {
      await storyRepo.addReply(currentStory.id, currentUserId, replyText.trim());
      setReplyText('');
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2000);
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  // ─── Tap zones ───────────────────────────────────────────────────────────

  const handleTap = (x: number) => {
    const leftZone = SCREEN_WIDTH * 0.35;
    const rightZone = SCREEN_WIDTH * 0.65;

    if (x < leftZone) {
      goPrev();
    } else if (x > rightZone) {
      goNext();
    } else {
      // Middle: pause / resume
      setIsPaused(prev => !prev);
    }
  };

  // ─── Long press ──────────────────────────────────────────────────────────

  const handleLongPressIn = () => {
    longPressRef.current = true;
    setIsPaused(true);
  };

  const handleLongPressOut = () => {
    longPressRef.current = false;
    setIsPaused(false);
  };

  if (!currentGroup || !currentStory) {
    return null;
  }

  const authorName =
    currentGroup.author.displayName || currentGroup.author.username;
  const avatarUri =
    currentGroup.author.profilePicture || currentGroup.author.avatarUri;
  const mediaUri =
    currentStory.media.localUri || currentStory.media.remoteUri || '';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Media layer */}
      <TouchableWithoutFeedback
        onPress={e => handleTap(e.nativeEvent.locationX)}
        onLongPress={handleLongPressIn}
        onPressOut={handleLongPressOut}
        delayLongPress={200}
      >
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: mediaUri }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              shouldPlay={!isPaused}
              onPlaybackStatusUpdate={handlePlaybackStatus}
            />
          ) : (
            <Image
              source={{ uri: mediaUri }}
              style={styles.media}
              resizeMode="contain"
            />
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Dark gradient overlay — top */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />
      {/* Dark gradient overlay — bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Progress bars */}
      <View style={[styles.progressContainer, { marginTop: insets.top + 4 }]}>
        {currentGroup.stories.map((story, idx) => {
          let fill = 0;
          if (idx < storyIndex) fill = 1;
          else if (idx === storyIndex) fill = elapsed;
          else fill = 0;

          return (
            <View key={story.id} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(fill * 100, 100)}%` },
                ]}
              />
            </View>
          );
        })}
      </View>

      {/* Header row */}
      <View style={[styles.header, { marginTop: insets.top + 16 }]}>
        <View style={styles.authorRow}>
          <DefaultAvatar
            uri={avatarUri}
            name={authorName}
            size={36}
            style={styles.avatar}
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorName}
            </Text>
            <Text style={styles.timeAgo}>
              {timeAgo(currentStory.createdAt)}
            </Text>
          </View>
        </View>

        {/* Views count — own stories only */}
        {isOwnStory && (
          <View style={styles.viewsRow}>
            <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.viewsText}>{currentStory.views}</Text>
          </View>
        )}

        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Add to Story button — own stories only */}
      {isOwnStory && onAddStory && (
        <View style={[styles.addStoryContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.addStoryBtn} onPress={onAddStory} activeOpacity={0.85}>
            <View style={styles.addStoryIcon}>
              <Ionicons name="add" size={22} color="#FFF" />
            </View>
            <Text style={styles.addStoryText}>Add to Story</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reply input — hide for own stories */}
      {!isOwnStory && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.replyContainer}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.replyRow, { paddingBottom: insets.bottom + 8 }]}>
            {replySent ? (
              <View style={styles.replySentBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#4CD964" />
                <Text style={styles.replySentText}>Reply sent</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Send a reply..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={replyText}
                  onChangeText={setReplyText}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  returnKeyType="send"
                  onSubmitEditing={handleSendReply}
                />
                {replyText.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendReply}
                    disabled={sendingReply}
                  >
                    {sendingReply ? (
                      <ActivityIndicator size="small" color={ACCENT} />
                    ) : (
                      <Ionicons name="send" size={22} color={ACCENT} />
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  addStoryContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addStoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addStoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  authorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFF',
    marginRight: 8,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 1,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 4,
  },
  viewsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 3,
  },
  closeButton: {
    padding: 4,
  },
  replyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  replyInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sendButton: {
    marginLeft: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySentBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  replySentText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default StoryViewerScreen;
