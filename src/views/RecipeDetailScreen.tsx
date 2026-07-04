import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  TextInput,
  Animated,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { PostWithAuthor } from '../models/Post';
import { User } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface RecipeDetailScreenProps {
  post: PostWithAuthor;
  currentUser: User | null;
  onBack: () => void;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onShare: () => void;
  onAuthorPress?: (userId: string) => void;
}

type ViewMode = 'overview' | 'steps';

interface RecipeStep {
  id: number;
  title: string;
  description: string;
  duration?: string;
  tip?: string;
  image?: string;
}


const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = observer(({
  post,
  currentUser,
  onBack,
  onLike,
  onSave,
  onComment,
  onShare,
  onAuthorPress,
}) => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [currentStep, setCurrentStep] = useState(0);
  const [servings, setServings] = useState(post.servings ?? 4);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [userRating, setUserRating] = useState(0); // User's rating (0-5)
  const [hoveredStar, setHoveredStar] = useState(0); // For hover effect
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set()); // Track completed steps
  const [showStepNavigation, setShowStepNavigation] = useState(false); // Show step list modal
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null); // Active timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(true); // Start with loading true
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const stepsFlatListRef = useRef<FlatList>(null);
  const timerIntervalRef = useRef<any>(null);
  const userRepo = useRef(new UserRepository()).current;

  // Fetch actual follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !post.author) {
        setIsFollowLoading(false);
        return;
      }

      try {
        const following = await userRepo.isFollowing(currentUser.id, post.author.id);
        setIsFollowing(following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setIsFollowLoading(false);
      }
    };

    checkFollowStatus();
  }, [currentUser?.id, post.author?.id]);

  const textColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#FFF';
  const cardBg = colorScheme === 'dark' ? '#1A1A1A' : '#F8F8F8';
  const borderColor = colorScheme === 'dark' ? '#333' : '#E0E0E0';
  const accentColor = '#FF6B35';

  const isLiked = post.isLiked ?? false;
  const isSaved = post.isSaved ?? false;

  // Handle rating
  const handleRating = (rating: number) => {
    setUserRating(rating);
    console.log('User rated:', rating);
    // TODO: Save rating to backend
  };

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!currentUser || !post.author || isFollowLoading) return;
    
    // Prevent the user from following themselves
    if (currentUser.id === post.author.id) return;

    setIsFollowLoading(true);
    const wasFollowing = isFollowing;
    
    // Optimistic update
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await userRepo.unfollowUser(currentUser.id, post.author.id);
        console.log('Unfollowed', post.author.username);
      } else {
        await userRepo.followUser(currentUser.id, post.author.id);
        console.log('Followed', post.author.username);
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      console.error('Error toggling follow:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Build real step objects from post.steps strings.
  // Photos are mapped by order: step 0 → photo 0, step 1 → photo 1, cycling when fewer photos than steps.
  const stepPhotos = post.media?.filter(m => m.type !== 'video') ?? [];
  const recipeSteps: RecipeStep[] = (post.steps?.filter(s => s.trim()) ?? []).map((step, i) => {
    const photo = stepPhotos.length > 0 ? stepPhotos[i % stepPhotos.length] : null;
    return {
      id: i + 1,
      title: `Step ${i + 1}`,
      description: step,
      image: photo?.remoteUri || photo?.localUri || post.media?.[0]?.remoteUri || post.media?.[0]?.localUri,
    };
  });

  // Real ingredients from post data
  const postIngredients = post.ingredients?.filter(i => i.trim()) ?? [];

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.3, 1],
    extrapolate: 'clamp',
  });

  // Timer logic
  useEffect(() => {
    if (timerMinutes !== null && (timerMinutes > 0 || timerSeconds > 0)) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev > 0) return prev - 1;
          if (timerMinutes! > 0) {
            setTimerMinutes((m) => m! - 1);
            return 59;
          }
          // Timer finished
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          alert('Timer finished! ⏰');
          setTimerMinutes(null);
          return 0;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerMinutes, timerSeconds]);

  const startTimer = (duration: string) => {
    const minutes = parseInt(duration);
    if (!isNaN(minutes) && minutes > 0) {
      setTimerMinutes(minutes);
      setTimerSeconds(0);
    }
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setTimerMinutes(null);
    setTimerSeconds(0);
  };

  const handleNextStep = () => {
    if (currentStep < recipeSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      stepsFlatListRef.current?.scrollToIndex({ index: nextStep, animated: true });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      stepsFlatListRef.current?.scrollToIndex({ index: prevStep, animated: true });
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    stepsFlatListRef.current?.scrollToIndex({ index: stepIndex, animated: true });
    setShowStepNavigation(false);
  };

  const toggleStepComplete = (stepId: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const adjustServings = (newServings: number) => {
    if (newServings >= 1 && newServings <= 20) {
      setServings(newServings);
    }
  };
  const renderOverviewMode = () => (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
      )}
      scrollEventThrottle={16}
    >
      {/* Hero Image with Gradient */}
      <View style={styles.heroContainer}>
        <Animated.Image
          source={{ uri: post.media?.[activeMediaIndex]?.remoteUri || post.media?.[activeMediaIndex]?.localUri || 'https://via.placeholder.com/400x300' }}
          style={[styles.heroImage, { transform: [{ scale: imageScale }] }]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.heroGradient}
        >
          <Text style={styles.recipeTitleHero} numberOfLines={2}>
            {post.caption || 'Delicious Recipe'}
          </Text>
          
          {/* Media Pagination Dots */}
          {post.media && post.media.length > 1 && (
            <View style={styles.mediaPagination}>
              {post.media.map((_: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setActiveMediaIndex(index)}
                  style={[
                    styles.paginationDot,
                    index === activeMediaIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Recipe Video */}
      {(() => {
        const videoMedia = post.media?.find(m => m.type === 'video');
        const videoUri = videoMedia?.localUri || videoMedia?.remoteUri;
        if (!videoUri) return null;
        return (
          <View style={styles.recipeVideoSection}>
            <View style={styles.recipeVideoCard}>
              <Video
                source={{ uri: videoUri }}
                style={styles.recipeVideoPlayer}
                resizeMode={ResizeMode.COVER}
                useNativeControls
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.55)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.recipeVideoGradient}
                pointerEvents="none"
              />
              <View style={styles.recipeVideoBadge}>
                <Ionicons name="videocam" size={13} color="#fff" />
                <Text style={styles.recipeVideoBadgeText}>Recipe Video</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Author Info */}
      <View style={[styles.authorSection, { backgroundColor: cardBg }]}>
        <TouchableOpacity
          style={styles.authorLeft}
          onPress={() => {
            if (!post.author?.id) return;
            if (onAuthorPress) {
              onAuthorPress(post.author.id);
            } else {
              router.push(`/profile/${post.author.id}` as any);
            }
          }}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: post.author?.profilePicture || post.author?.avatarUri || `https://i.pravatar.cc/150?u=${post.author?.id}` }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: textColor }]}>
              {post.author?.username}
            </Text>
            <Text style={styles.authorSubtext}>Recipe Creator</Text>
          </View>
        </TouchableOpacity>
        {currentUser && currentUser.id !== post.author?.id && (
          <TouchableOpacity 
            style={[
              styles.followButton, 
              { backgroundColor: isFollowing ? borderColor : accentColor },
              isFollowLoading && { opacity: 0.6 }
            ]}
            onPress={handleFollow}
            disabled={isFollowLoading}
          >
            <Text style={[
              styles.followButtonText,
              { color: isFollowing ? textColor : '#FFF' }
            ]}>
              {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Stats */}
      <View style={[styles.statsContainer, { backgroundColor }]}>
        {post.prepTime ? (
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: cardBg }]}>
              <Ionicons name="time-outline" size={24} color={accentColor} />
            </View>
            <Text style={[styles.statLabel, { color: textColor }]}>Prep Time</Text>
            <Text style={[styles.statValue, { color: textColor }]}>{post.prepTime} min</Text>
          </View>
        ) : null}
        {post.cookTime ? (
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: cardBg }]}>
              <Ionicons name="flame-outline" size={24} color={accentColor} />
            </View>
            <Text style={[styles.statLabel, { color: textColor }]}>Cook Time</Text>
            <Text style={[styles.statValue, { color: textColor }]}>{post.cookTime} min</Text>
          </View>
        ) : null}
        {post.difficulty ? (
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: cardBg }]}>
              <Ionicons name="speedometer-outline" size={24} color={accentColor} />
            </View>
            <Text style={[styles.statLabel, { color: textColor }]}>Difficulty</Text>
            <Text style={[styles.statValue, { color: textColor }]}>{post.difficulty}</Text>
          </View>
        ) : null}
        {post.servings ? (
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: cardBg }]}>
              <Ionicons name="people-outline" size={24} color={accentColor} />
            </View>
            <Text style={[styles.statLabel, { color: textColor }]}>Servings</Text>
            <Text style={[styles.statValue, { color: textColor }]}>{post.servings}</Text>
          </View>
        ) : null}
      </View>

      {/* Ingredients Section */}
      <View style={[styles.section, { backgroundColor }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Ingredients</Text>
          
          {/* Servings Adjuster */}
          <View style={[styles.servingsControl, { backgroundColor: cardBg }]}>
            <TouchableOpacity
              onPress={() => adjustServings(servings - 1)}
              style={styles.servingsButton}
            >
              <Ionicons name="remove" size={18} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.servingsText, { color: textColor }]}>
              {servings} servings
            </Text>
            <TouchableOpacity
              onPress={() => adjustServings(servings + 1)}
              style={styles.servingsButton}
            >
              <Ionicons name="add" size={18} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.ingredientsList, { backgroundColor: cardBg }]}>
          {postIngredients.length === 0 ? (
            <Text style={[styles.ingredientName, { color: '#999', padding: 8 }]}>No ingredients listed.</Text>
          ) : (
            postIngredients.slice(0, showAllIngredients ? postIngredients.length : 6).map((ingredient, index) => (
              <View key={index} style={[styles.ingredientItem, { borderBottomColor: borderColor }]}>
                <View style={styles.checkboxContainer}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={accentColor} />
                </View>
                <Text style={[styles.ingredientName, { color: textColor }]}>
                  {ingredient}
                </Text>
              </View>
            ))
          )}

          {postIngredients.length > 6 && (
            <TouchableOpacity
              onPress={() => setShowAllIngredients(!showAllIngredients)}
              style={styles.showMoreButton}
            >
              <Text style={[styles.showMoreText, { color: accentColor }]}>
                {showAllIngredients ? 'Show Less' : `Show ${postIngredients.length - 6} More`}
              </Text>
              <Ionicons
                name={showAllIngredients ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={accentColor}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Start Cooking Button */}
      <View style={[styles.section, { backgroundColor }]}>
        <TouchableOpacity
          style={[styles.startCookingButton, { backgroundColor: accentColor }]}
          onPress={() => setViewMode('steps')}
        >
          <Ionicons name="play-circle" size={24} color="#FFF" />
          <Text style={styles.startCookingText}>Start Cooking ({recipeSteps.length} Steps)</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Description */}
      {(post.caption || post.title) ? (
        <View style={[styles.section, { backgroundColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>About This Recipe</Text>
          <Text style={[styles.description, { color: textColor }]}>
            {post.caption || post.title}
          </Text>
        </View>
      ) : null}

      {/* Nutrition Info */}
      {(post.calories || post.protein || post.carbs || post.fat) ? (
        <View style={[styles.section, { backgroundColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Nutrition (per serving)</Text>
          <View style={[styles.nutritionGrid, { backgroundColor: cardBg }]}>
            {post.calories ? (
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: textColor }]}>{post.calories}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
            ) : null}
            {post.protein ? (
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: textColor }]}>{post.protein}g</Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
            ) : null}
            {post.carbs ? (
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: textColor }]}>{post.carbs}g</Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
            ) : null}
            {post.fat ? (
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: textColor }]}>{post.fat}g</Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Rate This Recipe Section */}
      <View style={[styles.section, { backgroundColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Rate This Recipe</Text>
        <View style={[styles.ratingContainer, { backgroundColor: cardBg }]}>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= (hoveredStar || userRating) ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= (hoveredStar || userRating) ? '#FFD700' : '#999'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {userRating > 0 && (
            <Text style={[styles.ratingText, { color: textColor }]}>
              You rated this recipe {userRating} star{userRating > 1 ? 's' : ''}!
            </Text>
          )}
        </View>
      </View>

      {/* Add Notes Section */}
      <View style={[styles.section, { backgroundColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>My Notes</Text>
        <TextInput
          style={[styles.notesInput, { 
            backgroundColor: cardBg, 
            color: textColor,
            borderColor: borderColor,
          }]}
          placeholder="Add your personal notes, modifications, or tips..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          value={userNote}
          onChangeText={setUserNote}
        />
      </View>

      {/* Engagement Section */}
      <View style={[styles.section, { backgroundColor }]}>
        <View style={styles.engagementStats}>
          <Text style={[styles.engagementText, { color: textColor }]}>
            <Text style={styles.boldText}>{post.likesCount}</Text> likes
          </Text>
          <Text style={[styles.engagementText, { color: textColor }]}>
            <Text style={styles.boldText}>{post.commentsCount}</Text> comments
          </Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderStepItem = ({ item, index }: { item: RecipeStep; index: number }) => (
    <View style={[styles.stepContainer, { width: SCREEN_WIDTH }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.stepScrollContent}
      >
        {/* Step Image */}
        <View style={styles.stepImageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.stepImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.stepImageGradient}
          />
        </View>

        {/* Step Content */}
        <View style={[styles.stepContent, { backgroundColor }]}>
          {/* Step Number Badge */}
          <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.stepBadgeText}>Step {index + 1} of {recipeSteps.length}</Text>
          </View>

          {/* Step Title */}
          <Text style={[styles.stepTitle, { color: textColor }]}>{item.title}</Text>

          {/* Duration */}
          {item.duration && (
            <View style={[styles.stepDuration, { backgroundColor: cardBg }]}>
              <Ionicons name="timer-outline" size={18} color={accentColor} />
              <Text style={[styles.stepDurationText, { color: textColor }]}>
                {item.duration}
              </Text>
            </View>
          )}

          {/* Step Description */}
          <Text style={[styles.stepDescription, { color: textColor }]}>
            {item.description}
          </Text>

          {/* Tip Box */}
          {item.tip && (
            <View style={[styles.tipBox, { backgroundColor: cardBg, borderColor: accentColor }]}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb" size={20} color={accentColor} />
                <Text style={[styles.tipLabel, { color: accentColor }]}>Pro Tip</Text>
              </View>
              <Text style={[styles.tipText, { color: textColor }]}>{item.tip}</Text>
            </View>
          )}

          {/* Step Actions */}
          <View style={styles.stepActions}>
            <TouchableOpacity
              style={[
                styles.stepActionButton,
                {
                  borderColor: timerMinutes !== null ? accentColor : borderColor,
                  backgroundColor: timerMinutes !== null ? `${accentColor}20` : 'transparent',
                },
              ]}
              onPress={() => {
                if (timerMinutes !== null) {
                  stopTimer();
                } else if (item.duration) {
                  startTimer(item.duration);
                }
              }}
            >
              <Ionicons
                name={timerMinutes !== null ? 'stop-circle-outline' : 'alarm-outline'}
                size={22}
                color={timerMinutes !== null ? accentColor : textColor}
              />
              <Text style={[styles.stepActionText, { color: timerMinutes !== null ? accentColor : textColor }]}>
                {timerMinutes !== null
                  ? `${timerMinutes}:${timerSeconds.toString().padStart(2, '0')}`
                  : 'Set Timer'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.stepActionButton,
                {
                  borderColor: completedSteps.has(item.id) ? '#4CAF50' : borderColor,
                  backgroundColor: completedSteps.has(item.id) ? '#4CAF5020' : 'transparent',
                },
              ]}
              onPress={() => toggleStepComplete(item.id)}
            >
              <Ionicons
                name={completedSteps.has(item.id) ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={22}
                color={completedSteps.has(item.id) ? '#4CAF50' : accentColor}
              />
              <Text
                style={[
                  styles.stepActionText,
                  { color: completedSteps.has(item.id) ? '#4CAF50' : textColor },
                ]}
              >
                {completedSteps.has(item.id) ? 'Completed' : 'Mark Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderStepsMode = () => (
    <View style={[styles.stepsContainer, { backgroundColor }]}>
      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: cardBg }]}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: accentColor,
              width: `${((currentStep + 1) / recipeSteps.length) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Steps Carousel */}
      <FlatList
        ref={stepsFlatListRef}
        data={recipeSteps}
        renderItem={renderStepItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id.toString()}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Navigation Controls */}
      <View style={[styles.stepsNavigation, { backgroundColor }]}>
        <TouchableOpacity
          style={[
            styles.navButton,
            { 
              backgroundColor: currentStep === 0 ? cardBg : accentColor,
              opacity: currentStep === 0 ? 0.5 : 1,
            },
          ]}
          onPress={handlePrevStep}
          disabled={currentStep === 0}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stepIndicator}
          onPress={() => setShowStepNavigation(true)}
        >
          <Ionicons name="list" size={20} color={accentColor} style={{ marginRight: 8 }} />
          <Text style={[styles.stepIndicatorText, { color: textColor }]}>
            {currentStep + 1} / {recipeSteps.length}
          </Text>
        </TouchableOpacity>

        {currentStep < recipeSteps.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: accentColor }]}
            onPress={handleNextStep}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => setViewMode('overview')}
          >
            <Ionicons name="checkmark-done" size={24} color="#FFF" />
            <Text style={styles.navButtonText}>Finish</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
      />

      {/* Fixed Back Button (Always Visible) */}
      {viewMode === 'overview' && (
        <View style={styles.fixedBackButton}>
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backButtonCircle, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          >
            <Ionicons name="arrow-back" size={26} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onShare}
            style={[styles.backButtonCircle, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          >
            <Ionicons name="share-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Animated Header (for scroll) */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor,
            borderBottomColor: borderColor,
            opacity: viewMode === 'steps' ? 1 : headerOpacity,
          },
        ]}
      >
        <TouchableOpacity
          onPress={viewMode === 'steps' ? () => setViewMode('overview') : onBack}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={26} color={textColor} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
          {viewMode === 'steps' ? 'Cooking Mode' : post.caption || 'Recipe'}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      {viewMode === 'overview' ? renderOverviewMode() : renderStepsMode()}

      {/* Floating Action Buttons */}
      {viewMode === 'overview' && (
        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: cardBg }]}
            onPress={onLike}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={26}
              color={isLiked ? '#FF3B47' : textColor}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: cardBg }]}
            onPress={onSave}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={isSaved ? accentColor : textColor}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: cardBg }]}
            onPress={onComment}
          >
            <Ionicons name="chatbubble-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      )}

      {/* Step Navigation Modal */}
      {showStepNavigation && (
        <View style={styles.stepNavigationOverlay}>
          <TouchableOpacity
            style={styles.stepNavigationBackdrop}
            onPress={() => setShowStepNavigation(false)}
            activeOpacity={1}
          />
          <View style={[styles.stepNavigationModal, { backgroundColor }]}>
            <View style={[styles.stepNavigationHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.stepNavigationTitle, { color: textColor }]}>
                Jump to Step
              </Text>
              <TouchableOpacity onPress={() => setShowStepNavigation(false)}>
                <Ionicons name="close" size={28} color={textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.stepNavigationList}>
              {recipeSteps.map((step, index) => (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.stepNavigationItem,
                    {
                      backgroundColor: index === currentStep ? `${accentColor}20` : 'transparent',
                      borderLeftColor: completedSteps.has(step.id) ? '#4CAF50' : accentColor,
                      borderLeftWidth: index === currentStep ? 4 : 2,
                    },
                  ]}
                  onPress={() => goToStep(index)}
                >
                  <View style={styles.stepNavigationItemLeft}>
                    <View
                      style={[
                        styles.stepNumberCircle,
                        {
                          backgroundColor: completedSteps.has(step.id)
                            ? '#4CAF50'
                            : index === currentStep
                            ? accentColor
                            : cardBg,
                        },
                      ]}
                    >
                      {completedSteps.has(step.id) ? (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      ) : (
                        <Text
                          style={[
                            styles.stepNumberText,
                            { color: index === currentStep ? '#FFF' : textColor },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <View style={styles.stepNavigationItemContent}>
                      <Text
                        style={[
                          styles.stepNavigationItemTitle,
                          {
                            color: textColor,
                            fontWeight: index === currentStep ? '700' : '600',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {step.title}
                      </Text>
                      {step.duration && (
                        <Text style={styles.stepNavigationItemDuration}>
                          ⏱ {step.duration}
                        </Text>
                      )}
                    </View>
                  </View>
                  {index === currentStep && (
                    <Ionicons name="radio-button-on" size={20} color={accentColor} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  recipeVideoSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  recipeVideoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  recipeVideoPlayer: {
    width: '100%',
    height: 380,
  },
  recipeVideoGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  recipeVideoBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  recipeVideoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  fixedBackButton: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  recipeTitleHero: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mediaPagination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFF',
    width: 24,
  },
  authorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  authorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  authorSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  servingsButton: {
    padding: 4,
  },
  servingsText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  ingredientsList: {
    borderRadius: 16,
    padding: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  ingredientName: {
    flex: 1,
    fontSize: 15,
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  startCookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
  },
  startCookingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderRadius: 16,
    marginTop: 12,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#999',
  },
  ratingContainer: {
    borderRadius: 16,
    padding: 24,
    marginTop: 12,
    alignItems: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  starButton: {
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  overallRating: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
    marginTop: 8,
    width: '100%',
  },
  overallRatingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  overallRatingText: {
    fontSize: 13,
    color: '#999',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  engagementStats: {
    flexDirection: 'row',
    gap: 20,
  },
  engagementText: {
    fontSize: 15,
  },
  boldText: {
    fontWeight: '600',
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    gap: 12,
    zIndex: 20,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  // Steps Mode Styles
  stepsContainer: {
    flex: 1,
  },
  progressBarContainer: {
    height: 4,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  stepContainer: {
    flex: 1,
  },
  stepScrollContent: {
    flexGrow: 1,
  },
  stepImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.4,
    position: 'relative',
  },
  stepImage: {
    width: '100%',
    height: '100%',
  },
  stepImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  stepBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  stepDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  stepDurationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  tipBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  stepActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  stepActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepsNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  navButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepIndicatorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepNavigationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  stepNavigationBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  stepNavigationModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  stepNavigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  stepNavigationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepNavigationList: {
    maxHeight: 400,
  },
  stepNavigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
  },
  stepNavigationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepNavigationItemContent: {
    flex: 1,
  },
  stepNavigationItemTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  stepNavigationItemDuration: {
    fontSize: 13,
    color: '#999',
  },
});

export default RecipeDetailScreen;
