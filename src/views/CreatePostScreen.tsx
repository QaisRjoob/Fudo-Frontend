import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert, useColorScheme, KeyboardAvoidingView,
  Platform, FlatList, Dimensions,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CreatePostViewModel, CUISINE_TAGS } from '../viewmodels';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/AuthService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CreatePostScreen = observer(() => {
  const [viewModel] = useState(() => new CreatePostViewModel());
  const router = useRouter();
  const { user } = useAuth();
  const { editPostId } = useLocalSearchParams<{ editPostId?: string }>();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#fff';
  const cardBg = dark ? '#1c1c1e' : '#f9f9f9';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const borderColor = dark ? '#333' : '#e5e5ea';
  const tintColor = '#007AFF';
  const accentColor = '#FF6B35';

  const isEditing = !!editPostId;

  useEffect(() => {
    if (editPostId) {
      viewModel.loadForEdit(editPostId);
    }
  }, [editPostId]);

  const handlePost = async () => {
    if (isEditing) {
      const ok = await viewModel.saveEdit();
      if (ok) {
        Alert.alert('Saved', 'Recipe updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } else {
      // Use AuthContext user first, then fall back to in-memory AuthService.
      // Never silently post as the demo 'current-user' account.
      const authorId = user?.id ?? AuthService.getCurrentUserId();
      if (!authorId) {
        Alert.alert('Not logged in', 'Please log in to post a recipe.');
        return;
      }
      const post = await viewModel.createPost(authorId);
      if (post) {
        Alert.alert('Success', 'Recipe posted!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    }
  };

  const canPost = isEditing
    ? !viewModel.isUploading
    : !viewModel.isUploading;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {isEditing ? 'Edit Recipe' : 'New Recipe'}
        </Text>
        <TouchableOpacity onPress={handlePost} disabled={!canPost}>
          {viewModel.isUploading ? (
            <ActivityIndicator size="small" color={tintColor} />
          ) : (
            <Text style={[styles.postBtn, !canPost && styles.postBtnDisabled]}>
              {isEditing ? 'Save' : 'Post'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Media Section */}
        {!isEditing && (
          <View style={styles.mediaSection}>
            <Text style={[styles.mediaSectionHint, { color: subtitleColor }]}>
              PHOTOS (optional) · each photo maps to its step in order
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {viewModel.media.map((item, index) => (
                <View key={item.id} style={styles.mediaThumb}>
                  <Image
                    source={{ uri: item.localUri || item.remoteUri }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                  <View style={styles.mediaStepBadge}>
                    <Text style={styles.mediaStepBadgeText}>Step {index + 1}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => viewModel.removeMedia(index)}>
                    <Ionicons name="close-circle" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {viewModel.media.length < 10 && (
                <View style={styles.addRow}>
                  <TouchableOpacity
                    style={[styles.addBtn, { borderColor: tintColor }]}
                    onPress={() => viewModel.pickImages()}
                  >
                    <Ionicons name="images-outline" size={30} color={tintColor} />
                    <Text style={[styles.addBtnText, { color: tintColor }]}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addBtn, { borderColor: tintColor, marginLeft: 8 }]}
                    onPress={() => viewModel.takePhoto()}
                  >
                    <Ionicons name="camera-outline" size={30} color={tintColor} />
                    <Text style={[styles.addBtnText, { color: tintColor }]}>Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Recipe Video Section */}
        {!isEditing && (
          <View style={[styles.videoSection, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.videoSectionHeader}>
              <Ionicons name="videocam-outline" size={20} color={accentColor} />
              <Text style={[styles.videoSectionTitle, { color: textColor }]}>Recipe Video</Text>
              <Text style={[styles.videoSectionHint, { color: subtitleColor }]}>optional · 1 video</Text>
            </View>
            {viewModel.recipeVideo ? (
              <View style={styles.videoPreviewWrap}>
                <Image
                  source={{ uri: viewModel.recipeVideo.thumbnailUri || viewModel.recipeVideo.localUri || viewModel.recipeVideo.remoteUri || '' }}
                  style={styles.videoPreview}
                  resizeMode="cover"
                />
                <View style={styles.videoPlayBadge}>
                  <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                </View>
                <TouchableOpacity style={styles.removeVideoBtn} onPress={() => viewModel.removeRecipeVideo()}>
                  <Ionicons name="close-circle" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addVideoBtn, { borderColor: accentColor }]}
                onPress={() => viewModel.pickRecipeVideo()}
              >
                <Ionicons name="play-circle-outline" size={36} color={accentColor} />
                <Text style={[styles.addVideoBtnText, { color: accentColor }]}>Add Recipe Video</Text>
                <Text style={[styles.addVideoSubtext, { color: subtitleColor }]}>Show how it's made</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Basic Info */}
        <Section title="Recipe Info" textColor={textColor} subtitleColor={subtitleColor}>
          <FieldInput
            icon="restaurant-outline"
            placeholder="Recipe title *"
            value={viewModel.title}
            onChangeText={v => viewModel.setTitle(v)}
            textColor={textColor}
            subtitleColor={subtitleColor}
            borderColor={borderColor}
          />
          <FieldInput
            icon="pencil-outline"
            placeholder="Caption / description"
            value={viewModel.caption}
            onChangeText={v => viewModel.setCaption(v)}
            multiline
            textColor={textColor}
            subtitleColor={subtitleColor}
            borderColor={borderColor}
          />
          <View style={styles.rowFields}>
            <FieldInput
              icon="time-outline"
              placeholder="Prep time (min)"
              value={viewModel.prepTime}
              onChangeText={v => viewModel.setPrepTime(v)}
              keyboardType="numeric"
              style={{ flex: 1, marginRight: 8 }}
              textColor={textColor}
              subtitleColor={subtitleColor}
              borderColor={borderColor}
            />
            <FieldInput
              icon="flame-outline"
              placeholder="Cook time (min)"
              value={viewModel.cookTime}
              onChangeText={v => viewModel.setCookTime(v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              textColor={textColor}
              subtitleColor={subtitleColor}
              borderColor={borderColor}
            />
          </View>
          <View style={styles.rowFields}>
            <FieldInput
              icon="people-outline"
              placeholder="Servings"
              value={viewModel.servings}
              onChangeText={v => viewModel.setServings(v)}
              keyboardType="numeric"
              style={{ flex: 1, marginRight: 8 }}
              textColor={textColor}
              subtitleColor={subtitleColor}
              borderColor={borderColor}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: subtitleColor }]}>Difficulty</Text>
              <View style={[styles.difficultyRow, { borderColor }]}>
                {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.difficultyBtn,
                      viewModel.difficulty === d && { backgroundColor: accentColor, borderColor: accentColor },
                      viewModel.difficulty !== d && { borderColor },
                    ]}
                    onPress={() => viewModel.setDifficulty(d)}
                  >
                    <Text style={[styles.difficultyBtnText, { color: viewModel.difficulty === d ? '#fff' : subtitleColor }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <FieldInput
            icon="location-outline"
            placeholder="Location (optional)"
            value={viewModel.location}
            onChangeText={v => viewModel.setLocation(v)}
            textColor={textColor}
            subtitleColor={subtitleColor}
            borderColor={borderColor}
          />
        </Section>

        {/* Nutrition Info */}
        <Section title="Nutrition (per serving · optional)" textColor={textColor} subtitleColor={subtitleColor}>
          <View style={styles.rowFields}>
            <FieldInput
              icon="bonfire-outline"
              placeholder="Calories"
              value={viewModel.calories}
              onChangeText={v => viewModel.setCalories(v)}
              keyboardType="numeric"
              style={{ flex: 1, marginRight: 8 }}
              textColor={textColor}
              subtitleColor={subtitleColor}
              borderColor={borderColor}
            />
            <FieldInput
              icon="barbell-outline"
              placeholder="Protein (g)"
              value={viewModel.protein}
              onChangeText={v => viewModel.setProtein(v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              textColor={textColor}
              subtitleColor={subtitleColor}
              borderColor={borderColor}
            />
          </View>
          <View style={styles.rowFields}>
            <FieldInput
              icon="leaf-outline"
              placeholder="Carbs (g)"
              value={viewModel.carbs}
              onChangeText={v => viewModel.setCarbs(v)}
              keyboardType="numeric"
              style={{ flex: 1, marginRight: 8 }}
              textColor={textColor}
              subtitleColor={subtitleColor}
              borderColor={borderColor}
            />
            <FieldInput
              icon="water-outline"
              placeholder="Fat (g)"
              value={viewModel.fat}
              onChangeText={v => viewModel.setFat(v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              textColor={textColor}
              subtitleColor={subtitleColor}
              borderColor={borderColor}
            />
          </View>
        </Section>

        {/* Ingredients */}
        <Section title="Ingredients *" textColor={textColor} subtitleColor={subtitleColor}>
          {viewModel.ingredients.map((ing, idx) => (
            <View key={idx} style={[styles.listItemRow, { borderBottomColor: borderColor }]}>
              <Text style={[styles.listBullet, { color: accentColor }]}>•</Text>
              <TextInput
                style={[styles.listInput, { color: textColor }]}
                placeholder={`Ingredient ${idx + 1}`}
                placeholderTextColor={subtitleColor}
                value={ing}
                onChangeText={v => viewModel.setIngredient(idx, v)}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => viewModel.removeIngredient(idx)}>
                <Ionicons name="remove-circle-outline" size={20} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addListBtn} onPress={() => viewModel.addIngredient()}>
            <Ionicons name="add-circle-outline" size={20} color={tintColor} />
            <Text style={[styles.addListBtnText, { color: tintColor }]}>Add ingredient</Text>
          </TouchableOpacity>
        </Section>

        {/* Steps */}
        <Section title="Steps *" textColor={textColor} subtitleColor={subtitleColor}>
          {viewModel.media.length > 0 && (
            <Text style={[styles.stepImageHint, { color: subtitleColor }]}>
              Each step uses its matching photo. Extra steps reuse photos in order.
            </Text>
          )}
          {viewModel.steps.map((step, idx) => {
            const photoCount = viewModel.media.length;
            const assignedPhoto = photoCount > 0 ? viewModel.media[idx % photoCount] : null;
            return (
              <View key={idx} style={[styles.listItemRow, { borderBottomColor: borderColor, alignItems: 'flex-start' }]}>
                <View style={styles.stepLeftCol}>
                  <View style={[styles.stepNumber, { backgroundColor: accentColor }]}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  {assignedPhoto ? (
                    <Image
                      source={{ uri: assignedPhoto.localUri || assignedPhoto.remoteUri }}
                      style={styles.stepImageThumb}
                    />
                  ) : null}
                </View>
                <TextInput
                  style={[styles.listInput, { color: textColor, minHeight: 48 }]}
                  placeholder={`Step ${idx + 1} instructions`}
                  placeholderTextColor={subtitleColor}
                  value={step}
                  onChangeText={v => viewModel.setStep(idx, v)}
                  multiline
                />
                <TouchableOpacity onPress={() => viewModel.removeStep(idx)} style={{ paddingTop: 2 }}>
                  <Ionicons name="remove-circle-outline" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={styles.addListBtn} onPress={() => viewModel.addStep()}>
            <Ionicons name="add-circle-outline" size={20} color={tintColor} />
            <Text style={[styles.addListBtnText, { color: tintColor }]}>Add step</Text>
          </TouchableOpacity>
        </Section>

        {/* Tags */}
        <Section title={`Category Tags * (max 5) — ${viewModel.tags.length}/5`} textColor={textColor} subtitleColor={subtitleColor}>
          <View style={styles.tagsWrap}>
            {CUISINE_TAGS.map(tag => {
              const selected = viewModel.tags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    { borderColor: selected ? accentColor : borderColor },
                    selected && { backgroundColor: accentColor },
                  ]}
                  onPress={() => viewModel.toggleTag(tag)}
                >
                  <Text style={[styles.tagText, { color: selected ? '#fff' : textColor }]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {viewModel.isUploading && (
          <View style={styles.uploadRow}>
            <ActivityIndicator size="small" color={tintColor} />
            <Text style={[styles.uploadText, { color: subtitleColor }]}>
              {isEditing ? 'Saving…' : `Uploading… ${Math.round(viewModel.uploadProgress)}%`}
            </Text>
          </View>
        )}

        {viewModel.error && (
          <Text style={styles.errorText}>{viewModel.error}</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const Section = ({
  title, children, textColor, subtitleColor,
}: { title: string; children: React.ReactNode; textColor: string; subtitleColor: string }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: subtitleColor }]}>{title.toUpperCase()}</Text>
    {children}
  </View>
);

const FieldInput = ({
  icon, placeholder, value, onChangeText, multiline, keyboardType, style,
  textColor, subtitleColor, borderColor,
}: any) => (
  <View style={[styles.fieldRow, { borderColor }, style]}>
    <Ionicons name={icon} size={18} color={subtitleColor} style={styles.fieldIcon} />
    <TextInput
      style={[styles.fieldInput, { color: textColor }]}
      placeholder={placeholder}
      placeholderTextColor={subtitleColor}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      keyboardType={keyboardType ?? 'default'}
      returnKeyType={multiline ? 'default' : 'next'}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, paddingTop: Platform.OS === 'ios' ? 52 : 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  postBtn: { color: '#007AFF', fontSize: 16, fontWeight: '700' },
  postBtnDisabled: { color: '#ccc' },
  mediaSection: { padding: 16 },
  mediaSectionHint: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginBottom: 10 },
  mediaThumb: { marginRight: 10, position: 'relative' },
  mediaImage: { width: 100, height: 100, borderRadius: 8 },
  mediaStepBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  mediaStepBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  removeBtn: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
  },
  addRow: { flexDirection: 'row' },
  addBtn: {
    width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  addBtnText: { fontSize: 11, marginTop: 4 },
  section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: { flex: 1, fontSize: 15 },
  rowFields: { flexDirection: 'row' },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginBottom: 6 },
  difficultyRow: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden',
  },
  difficultyBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderWidth: 0,
  },
  difficultyBtnText: { fontSize: 13, fontWeight: '600' },
  listItemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  listBullet: { fontSize: 18, width: 16, textAlign: 'center' },
  listInput: { flex: 1, fontSize: 15 },
  stepLeftCol: { alignItems: 'center', gap: 4 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepImageThumb: { width: 36, height: 36, borderRadius: 6 },
  stepImageHint: { fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
  addListBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  addListBtnText: { fontSize: 15, fontWeight: '500' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  tagText: { fontSize: 13, fontWeight: '500' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  uploadText: { fontSize: 14 },
  errorText: { color: '#ff3b30', padding: 16, textAlign: 'center' },
  videoSection: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 12,
    borderWidth: 1, overflow: 'hidden',
  },
  videoSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  videoSectionTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  videoSectionHint: { fontSize: 12 },
  videoPreviewWrap: { position: 'relative' },
  videoPreview: { width: '100%', height: 200 },
  videoPlayBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  removeVideoBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14,
  },
  addVideoBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 24, gap: 6, borderWidth: 2, borderStyle: 'dashed',
    margin: 12, borderRadius: 10,
  },
  addVideoBtnText: { fontSize: 15, fontWeight: '600' },
  addVideoSubtext: { fontSize: 12 },
});
