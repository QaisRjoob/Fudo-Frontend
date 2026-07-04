import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, useColorScheme,
  Dimensions, Animated, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ExploreViewModel, CATEGORIES, SearchTab } from '../viewmodels/ExploreViewModel';
import { PostWithAuthor, User } from '../models';

const ORANGE       = '#FF6B35';
const ORANGE_LIGHT = '#FF8C5A';
const ORANGE_DARK  = '#E5501A';
const { width: W } = Dimensions.get('window');

const COL_GAP  = 3;
const COL_W    = (W - COL_GAP * 3) / 2;
const FEAT_H   = 260;
const TILE_H   = 160;

// ─── helpers ─────────────────────────────────────────────────────────────────

const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const thumbUri = (post: PostWithAuthor) =>
  post.media?.[0]?.remoteUri || post.media?.[0]?.localUri;

// ─── Category chip ────────────────────────────────────────────────────────────
const CategoryChip = React.memo(({
  label, emoji, active, onPress, dark,
}: { label: string; emoji: string; active: boolean; onPress: () => void; dark: boolean }) => {
  if (active) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={chipStyles.outer}>
        <LinearGradient
          colors={[ORANGE_LIGHT, ORANGE_DARK]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={chipStyles.active}
        >
          <Text style={chipStyles.activeEmoji}>{emoji}</Text>
          <Text style={chipStyles.activeLabel}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[chipStyles.inactive, { backgroundColor: dark ? '#1c1c1e' : '#fff' }]}
    >
      <Text style={chipStyles.inactiveEmoji}>{emoji}</Text>
      <Text style={[chipStyles.inactiveLabel, { color: dark ? '#fff' : '#1a1a1a' }]}>{label}</Text>
    </TouchableOpacity>
  );
});

const chipStyles = StyleSheet.create({
  outer:         { marginRight: 8 },
  active:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 },
  activeEmoji:   { fontSize: 14 },
  activeLabel:   { fontSize: 13, fontWeight: '700', color: '#fff' },
  inactive:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, marginRight: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2 },
  inactiveEmoji: { fontSize: 14 },
  inactiveLabel: { fontSize: 13, fontWeight: '500' },
});

// ─── Featured tile (full width) ───────────────────────────────────────────────
const FeaturedTile = React.memo(({
  post, onPress,
}: { post: PostWithAuthor; onPress: () => void }) => {
  const uri = thumbUri(post);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={tileStyles.featured}>
      {uri
        ? <Image source={{ uri }} style={tileStyles.featuredImg} resizeMode="cover" />
        : <View style={[tileStyles.featuredImg, { backgroundColor: '#2a2a2a' }]} />}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.75)']}
        style={tileStyles.overlay}
      >
        {/* Recipe tag */}
        <LinearGradient colors={[ORANGE_LIGHT, ORANGE_DARK]} style={tileStyles.featTag}>
          <Ionicons name="restaurant" size={11} color="#fff" />
          <Text style={tileStyles.featTagText}>FEATURED</Text>
        </LinearGradient>
        <Text style={tileStyles.featTitle} numberOfLines={2}>
          {post.title || post.caption}
        </Text>
        <View style={tileStyles.featMeta}>
          <Image
            source={{ uri: post.author?.avatarUri || `https://i.pravatar.cc/40?u=${post.authorId}` }}
            style={tileStyles.featAvatar}
          />
          <Text style={tileStyles.featAuthor}>@{post.author?.username}</Text>
          <View style={tileStyles.featStats}>
            <Ionicons name="heart" size={13} color="#fff" />
            <Text style={tileStyles.featStatText}>{post.likesCount}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

// ─── Small grid tile ─────────────────────────────────────────────────────────
const GridTile = React.memo(({
  post, onPress, tall = false,
}: { post: PostWithAuthor; onPress: () => void; tall?: boolean }) => {
  const uri = thumbUri(post);
  const h   = tall ? TILE_H * 1.5 : TILE_H;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[tileStyles.grid, { height: h }]}>
      {uri
        ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#333' }]} />}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={tileStyles.gridOverlay}
      >
        <Text style={tileStyles.gridTitle} numberOfLines={2}>
          {post.title || post.caption}
        </Text>
        <View style={tileStyles.gridMeta}>
          <Ionicons name="heart" size={11} color="#fff" />
          <Text style={tileStyles.gridMetaText}>{post.likesCount}</Text>
          {post.cookTime ? (
            <>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6 }} />
              <Text style={tileStyles.gridMetaText}>{post.cookTime}m</Text>
            </>
          ) : null}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

const tileStyles = StyleSheet.create({
  // Featured
  featured:    { width: W, height: FEAT_H, marginBottom: COL_GAP },
  featuredImg: { ...StyleSheet.absoluteFillObject },
  overlay:     { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 14 },
  featTag:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  featTagText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  featTitle:   { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 10, lineHeight: 24 },
  featMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featAvatar:  { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#fff' },
  featAuthor:  { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500', flex: 1 },
  featStats:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featStatText:{ fontSize: 13, color: '#fff', fontWeight: '600' },
  // Grid
  grid:        { width: COL_W, overflow: 'hidden', borderRadius: 0 },
  gridOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 8 },
  gridTitle:   { fontSize: 12, fontWeight: '700', color: '#fff', lineHeight: 16, marginBottom: 4 },
  gridMeta:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridMetaText:{ fontSize: 11, color: '#fff', fontWeight: '500' },
});

// ─── People search result card ────────────────────────────────────────────────
const PersonCard = React.memo(({
  user, onPress, onFollow, dark,
}: { user: User; onPress: () => void; onFollow: () => void; dark: boolean }) => {
  const cardBg    = dark ? '#1c1c1e' : '#fff';
  const textColor = dark ? '#fff'    : '#1a1a1a';
  const subColor  = dark ? '#8e8e93' : '#6c6c70';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[personStyles.card, { backgroundColor: cardBg }]}>
      <Image
        source={{ uri: user.avatarUri || `https://i.pravatar.cc/80?u=${user.id}` }}
        style={personStyles.avatar}
      />
      <View style={personStyles.info}>
        <Text style={[personStyles.name, { color: textColor }]} numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        <Text style={[personStyles.username, { color: subColor }]} numberOfLines={1}>
          @{user.username}
        </Text>
        <Text style={[personStyles.stats, { color: subColor }]}>
          {user.followersCount} followers
        </Text>
      </View>
      <TouchableOpacity
        onPress={onFollow}
        activeOpacity={0.85}
        style={user.isFollowing ? personStyles.followingBtn : undefined}
      >
        {user.isFollowing ? (
          <Text style={[personStyles.followingText, { color: subColor }]}>Following</Text>
        ) : (
          <LinearGradient colors={[ORANGE_LIGHT, ORANGE_DARK]} style={personStyles.followBtn}>
            <Text style={personStyles.followBtnText}>Follow</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const personStyles = StyleSheet.create({
  card:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatar:       { width: 52, height: 52, borderRadius: 26 },
  info:         { flex: 1 },
  name:         { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  username:     { fontSize: 13, marginBottom: 2 },
  stats:        { fontSize: 12 },
  followBtn:    { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20 },
  followBtnText:{ fontSize: 13, fontWeight: '700', color: '#fff' },
  followingBtn: { paddingHorizontal: 14, paddingVertical: 7 },
  followingText:{ fontSize: 13, fontWeight: '600' },
});

// ─── Search post tile (compact) ───────────────────────────────────────────────
const SearchPostTile = React.memo(({
  post, onPress, dark,
}: { post: PostWithAuthor; onPress: () => void; dark: boolean }) => {
  const cardBg    = dark ? '#1c1c1e' : '#fff';
  const textColor = dark ? '#fff'    : '#1a1a1a';
  const subColor  = dark ? '#8e8e93' : '#6c6c70';
  const uri = thumbUri(post);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={[searchTileStyles.card, { backgroundColor: cardBg }]}>
      <View style={searchTileStyles.imgWrap}>
        {uri
          ? <Image source={{ uri }} style={searchTileStyles.img} resizeMode="cover" />
          : <View style={[searchTileStyles.img, { backgroundColor: '#333' }]} />}
      </View>
      <View style={searchTileStyles.info}>
        <Text style={[searchTileStyles.title, { color: textColor }]} numberOfLines={2}>
          {post.title || post.caption}
        </Text>
        <View style={searchTileStyles.meta}>
          <Image
            source={{ uri: post.author?.avatarUri || `https://i.pravatar.cc/40?u=${post.authorId}` }}
            style={searchTileStyles.avatar}
          />
          <Text style={[searchTileStyles.author, { color: subColor }]}>@{post.author?.username}</Text>
        </View>
        <View style={searchTileStyles.stats}>
          <Ionicons name="heart-outline" size={13} color={ORANGE} />
          <Text style={[searchTileStyles.stat, { color: subColor }]}>{post.likesCount}</Text>
          <Ionicons name="chatbubble-outline" size={13} color={subColor} style={{ marginLeft: 8 }} />
          <Text style={[searchTileStyles.stat, { color: subColor }]}>{post.commentsCount ?? 0}</Text>
          {post.cookTime ? (
            <>
              <Ionicons name="time-outline" size={13} color={subColor} style={{ marginLeft: 8 }} />
              <Text style={[searchTileStyles.stat, { color: subColor }]}>{post.cookTime}m</Text>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const searchTileStyles = StyleSheet.create({
  card:    { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  imgWrap: { borderRadius: 12, overflow: 'hidden' },
  img:     { width: 80, height: 80, borderRadius: 12 },
  info:    { flex: 1, justifyContent: 'center', gap: 4 },
  title:   { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  meta:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar:  { width: 18, height: 18, borderRadius: 9 },
  author:  { fontSize: 12 },
  stats:   { flexDirection: 'row', alignItems: 'center' },
  stat:    { fontSize: 12, marginLeft: 3 },
});

// ─── ExploreScreen ────────────────────────────────────────────────────────────
export const ExploreScreen = observer(() => {
  const [vm] = useState(() => new ExploreViewModel());
  const router  = useRouter();
  const dark    = useColorScheme() === 'dark';
  const inputRef = useRef<TextInput>(null);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  const bg         = dark ? '#0a0a0a' : '#f0f0f0';
  const cardBg     = dark ? '#1c1c1e' : '#fff';
  const textColor  = dark ? '#fff'    : '#1a1a1a';
  const subColor   = dark ? '#8e8e93' : '#6c6c70';
  const inputBg    = dark ? '#1c1c1e' : '#fff';
  const divider    = dark ? '#222'    : '#e5e5ea';

  useEffect(() => { vm.initialize(); }, []);

  const activateSearch = () => {
    vm.setSearchActive(true);
    Animated.timing(searchBarAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelSearch = () => {
    inputRef.current?.blur();
    vm.setSearchActive(false);
    Animated.timing(searchBarAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const openPost = (post: PostWithAuthor) => router.push(`/post/${post.id}` as any);
  const openProfile = (userId: string) => router.push(`/profile/${userId}` as any);

  // Build the grid rows for the browse view
  // Layout: full-width featured every ~7 items, then 2-col pairs
  const buildRows = (posts: PostWithAuthor[]) => {
    const rows: { type: 'featured'; post: PostWithAuthor }
              | { type: 'pair'; left: PostWithAuthor; right?: PostWithAuthor }[] = [];
    let i = 0;
    while (i < posts.length) {
      if (i % 7 === 0) {
        rows.push({ type: 'featured', post: posts[i] } as any);
        i++;
      } else {
        rows.push({ type: 'pair', left: posts[i], right: posts[i + 1] } as any);
        i += 2;
      }
    }
    return rows;
  };

  // ── Search tabs ────────────────────────────────────────────────────────────
  const renderSearchTabs = () => (
    <View style={[styles.searchTabs, { borderBottomColor: divider }]}>
      {(['all', 'people', 'posts'] as SearchTab[]).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.searchTab, vm.searchTab === tab && styles.searchTabActive]}
          onPress={() => vm.setSearchTab(tab)}
        >
          <Text style={[
            styles.searchTabText,
            { color: vm.searchTab === tab ? ORANGE : subColor },
            vm.searchTab === tab && styles.searchTabTextActive,
          ]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
          {vm.searchTab === tab && <View style={styles.searchTabUnderline} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Search results ─────────────────────────────────────────────────────────
  const renderSearchResults = () => {
    if (vm.isLoadingSearch) {
      return <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 40 }} />;
    }
    if (!vm.searchQuery.trim()) {
      return (
        <View style={styles.searchHint}>
          <LinearGradient
            colors={['rgba(255,107,53,0.12)', 'rgba(255,107,53,0.04)']}
            style={styles.searchHintIcon}
          >
            <Ionicons name="search" size={36} color={ORANGE} />
          </LinearGradient>
          <Text style={[styles.searchHintTitle, { color: textColor }]}>Discover Recipes</Text>
          <Text style={[styles.searchHintSub, { color: subColor }]}>
            Search for dishes, chefs, ingredients…
          </Text>
        </View>
      );
    }

    const showPeople = vm.searchTab === 'all' || vm.searchTab === 'people';
    const showPosts  = vm.searchTab === 'all' || vm.searchTab === 'posts';

    const noPeople = showPeople && vm.searchUsers.length === 0;
    const noPosts  = showPosts  && vm.searchPosts.length  === 0;

    if (noPeople && noPosts) {
      return (
        <View style={styles.searchHint}>
          <Ionicons name="sad-outline" size={48} color={subColor} style={{ marginBottom: 12 }} />
          <Text style={[styles.searchHintTitle, { color: textColor }]}>No results</Text>
          <Text style={[styles.searchHintSub, { color: subColor }]}>
            Try different keywords
          </Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {showPeople && vm.searchUsers.length > 0 && (
          <>
            <View style={[styles.resultSection, { backgroundColor: bg }]}>
              <View style={styles.resultSectionHeader}>
                <View style={styles.resultAccent} />
                <Text style={[styles.resultSectionTitle, { color: textColor }]}>People</Text>
                <Text style={[styles.resultCount, { color: subColor }]}>{vm.searchUsers.length}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: cardBg }}>
              {vm.searchUsers.map((user, i) => (
                <React.Fragment key={user.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: divider, marginLeft: 80 }]} />}
                  <PersonCard
                    user={user}
                    dark={dark}
                    onPress={() => openProfile(user.id)}
                    onFollow={() => vm.followUser(user.id)}
                  />
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {showPosts && vm.searchPosts.length > 0 && (
          <>
            <View style={[styles.resultSection, { backgroundColor: bg, marginTop: 12 }]}>
              <View style={styles.resultSectionHeader}>
                <View style={styles.resultAccent} />
                <Text style={[styles.resultSectionTitle, { color: textColor }]}>Recipes</Text>
                <Text style={[styles.resultCount, { color: subColor }]}>{vm.searchPosts.length}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: cardBg }}>
              {vm.searchPosts.map((post, i) => (
                <React.Fragment key={post.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: divider, marginLeft: 108 }]} />}
                  <SearchPostTile post={post} dark={dark} onPress={() => openPost(post)} />
                </React.Fragment>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    );
  };

  // ── Browse grid ────────────────────────────────────────────────────────────
  const rows = buildRows(vm.posts);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: bg }]}>
        <Animated.View style={[
          styles.searchBarWrap,
          { backgroundColor: inputBg,
            flex: searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        ]}>
          <Ionicons name="search" size={17} color={subColor} style={{ marginLeft: 10 }} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search recipes, chefs…"
            placeholderTextColor={subColor}
            value={vm.searchQuery}
            onChangeText={t => vm.onSearchChange(t)}
            onFocus={activateSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {vm.isLoadingSearch && <ActivityIndicator size="small" color={ORANGE} style={{ marginRight: 10 }} />}
        </Animated.View>

        {vm.isSearchActive && (
          <TouchableOpacity onPress={cancelSearch} style={styles.cancelBtn} activeOpacity={0.7}>
            <Text style={[styles.cancelText, { color: ORANGE }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        {!vm.isSearchActive && (
          <LinearGradient colors={[ORANGE_LIGHT, ORANGE_DARK]} style={styles.filterBtn}>
            <Ionicons name="options-outline" size={18} color="#fff" />
          </LinearGradient>
        )}
      </View>

      {vm.isSearchActive ? (
        // ── SEARCH MODE ──────────────────────────────────────────────────────
        <View style={{ flex: 1 }}>
          {renderSearchTabs()}
          {renderSearchResults()}
        </View>
      ) : (
        // ── BROWSE MODE ──────────────────────────────────────────────────────
        <FlatList
          data={rows as any[]}
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={vm.isRefreshing}
              onRefresh={() => vm.refresh()}
              tintColor={ORANGE}
              colors={[ORANGE]}
            />
          }
          onEndReached={() => vm.loadMore()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            /* Category chips */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              style={[styles.chipsContainer, { backgroundColor: bg }]}
            >
              {CATEGORIES.map(cat => (
                <CategoryChip
                  key={cat.label}
                  label={cat.label}
                  emoji={cat.emoji}
                  active={vm.selectedCategory === cat.label}
                  onPress={() => vm.selectCategory(cat.label)}
                  dark={dark}
                />
              ))}
            </ScrollView>
          }
          renderItem={({ item }: { item: any }) => {
            if (item.type === 'featured') {
              return <FeaturedTile post={item.post} onPress={() => openPost(item.post)} />;
            }
            return (
              <View style={styles.pairRow}>
                <GridTile post={item.left} onPress={() => openPost(item.left)} tall={item.right === undefined} />
                {item.right
                  ? <GridTile post={item.right} onPress={() => openPost(item.right)} />
                  : <View style={{ width: COL_W }} />}
              </View>
            );
          }}
          ListEmptyComponent={
            vm.isLoading
              ? <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 60 }} />
              : (
                <View style={styles.emptyState}>
                  <LinearGradient
                    colors={['rgba(255,107,53,0.12)', 'rgba(255,107,53,0.04)']}
                    style={styles.emptyIcon}
                  >
                    <Ionicons name="restaurant-outline" size={48} color={ORANGE} />
                  </LinearGradient>
                  <Text style={[styles.emptyTitle, { color: textColor }]}>Nothing here yet</Text>
                  <Text style={[styles.emptySub, { color: subColor }]}>
                    Check back soon for delicious recipes
                  </Text>
                </View>
              )
          }
          ListFooterComponent={
            vm.isLoadingMore
              ? <ActivityIndicator size="small" color={ORANGE} style={{ marginVertical: 16 }} />
              : <View style={{ height: 24 }} />
          }
          contentContainerStyle={{ backgroundColor: bg }}
        />
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, height: 42,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, paddingHorizontal: 10 },
  cancelBtn:   { paddingHorizontal: 4 },
  cancelText:  { fontSize: 15, fontWeight: '600' },
  filterBtn:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Category chips
  chipsContainer: { paddingVertical: 8 },
  chipsRow:       { paddingHorizontal: 14, paddingBottom: 4 },

  // Grid pair row
  pairRow: { flexDirection: 'row', gap: COL_GAP, marginBottom: COL_GAP },

  // Search tabs
  searchTabs: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchTab: {
    flex: 1, paddingVertical: 12, alignItems: 'center', position: 'relative',
  },
  searchTabActive: {},
  searchTabText:   { fontSize: 14, fontWeight: '500' },
  searchTabTextActive: { fontWeight: '700' },
  searchTabUnderline: {
    position: 'absolute', bottom: 0, left: '15%', right: '15%',
    height: 2.5, borderRadius: 2, backgroundColor: ORANGE,
  },

  // Search hint / empty
  searchHint:      { alignItems: 'center', paddingTop: 64, gap: 12, paddingHorizontal: 40 },
  searchHintIcon:  { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  searchHintTitle: { fontSize: 20, fontWeight: '800' },
  searchHintSub:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Search result sections
  resultSection:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  resultSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultAccent:        { width: 4, height: 16, borderRadius: 2, backgroundColor: ORANGE },
  resultSectionTitle:  { fontSize: 16, fontWeight: '800' },
  resultCount:         { fontSize: 13 },
  divider:             { height: StyleSheet.hairlineWidth },

  // Empty browse state
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon:  { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub:   { fontSize: 14, textAlign: 'center' },
});
