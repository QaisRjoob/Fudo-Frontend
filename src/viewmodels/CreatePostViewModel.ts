import { makeAutoObservable, runInAction } from 'mobx';
import { Post, MediaItem } from '../models';
import { PostRepository } from '../repositories';
import MediaService from '../services/MediaService';

export const CUISINE_TAGS = [
  'Italian', 'Asian', 'Mexican', 'American', 'Mediterranean',
  'Indian', 'Vegan', 'Vegetarian', 'BBQ', 'Seafood',
  'Desserts', 'Breakfast', 'Lunch', 'Dinner', 'Snacks',
  'Healthy', 'Quick & Easy', 'Gluten-Free', 'Dairy-Free', 'Keto',
];

export class CreatePostViewModel {
  media: MediaItem[] = [];
  recipeVideo: MediaItem | null = null;
  caption: string = '';
  title: string = '';
  cookTime: string = '';
  prepTime: string = '';
  servings: string = '';
  difficulty: 'Easy' | 'Medium' | 'Hard' | '' = '';
  calories: string = '';
  protein: string = '';
  carbs: string = '';
  fat: string = '';
  ingredients: string[] = [''];
  steps: string[] = [''];
  tags: string[] = [];
  location: string = '';
  editPostId: string | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  error: string | null = null;

  private postRepo: PostRepository;
  private mediaService = MediaService;

  constructor() {
    this.postRepo = new PostRepository();
    makeAutoObservable(this);
  }

  async loadForEdit(postId: string): Promise<void> {
    try {
      const post = await this.postRepo.getPostById(postId);
      if (!post) return;
      runInAction(() => {
        this.editPostId = postId;
        this.caption = post.caption || '';
        this.title = post.title || '';
        this.cookTime = post.cookTime ? String(post.cookTime) : '';
        this.prepTime = (post as any).prepTime ? String((post as any).prepTime) : '';
        this.servings = post.servings ? String(post.servings) : '';
        this.difficulty = (post as any).difficulty || '';
        this.calories = (post as any).calories ? String((post as any).calories) : '';
        this.protein = (post as any).protein ? String((post as any).protein) : '';
        this.carbs = (post as any).carbs ? String((post as any).carbs) : '';
        this.fat = (post as any).fat ? String((post as any).fat) : '';
        this.ingredients = post.ingredients?.length ? post.ingredients : [''];
        this.steps = post.steps?.length ? post.steps : [''];
        this.tags = post.tags || [];
        this.location = post.location || '';
        this.media = post.media.filter(m => m.type !== 'video');
        this.recipeVideo = post.media.find(m => m.type === 'video') ?? null;
      });
    } catch (e: any) {
      runInAction(() => { this.error = e.message; });
    }
  }

  async pickImages(): Promise<void> {
    try {
      const hasPermission = await this.mediaService.requestPermissions();
      if (!hasPermission) { runInAction(() => { this.error = 'Permission denied'; }); return; }
      const picked = await this.mediaService.pickImages({ allowsMultipleSelection: true, maxSelection: 10 });
      runInAction(() => { this.media = [...this.media, ...picked].slice(0, 10); });
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to pick images'; });
    }
  }

  async pickRecipeVideo(): Promise<void> {
    try {
      const hasPermission = await this.mediaService.requestPermissions();
      if (!hasPermission) { runInAction(() => { this.error = 'Permission denied'; }); return; }
      const video = await this.mediaService.pickVideo();
      if (video) runInAction(() => { this.recipeVideo = { ...video, order: 0 }; });
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to pick video'; });
    }
  }

  removeRecipeVideo(): void { this.recipeVideo = null; }

  async takePhoto(): Promise<void> {
    try {
      const hasPermission = await this.mediaService.requestPermissions();
      if (!hasPermission) { runInAction(() => { this.error = 'Permission denied'; }); return; }
      const photo = await this.mediaService.takePhoto();
      if (photo) runInAction(() => { this.media = [...this.media, photo].slice(0, 10); });
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to take photo'; });
    }
  }

  removeMedia(index: number): void { this.media = this.media.filter((_, i) => i !== index); }

  setCaption(text: string): void { this.caption = text; }
  setTitle(text: string): void { this.title = text; }
  setCookTime(text: string): void { this.cookTime = text.replace(/[^0-9]/g, ''); }
  setPrepTime(text: string): void { this.prepTime = text.replace(/[^0-9]/g, ''); }
  setServings(text: string): void { this.servings = text.replace(/[^0-9]/g, ''); }
  setDifficulty(val: 'Easy' | 'Medium' | 'Hard'): void { this.difficulty = val; }
  setCalories(text: string): void { this.calories = text.replace(/[^0-9]/g, ''); }
  setProtein(text: string): void { this.protein = text.replace(/[^0-9]/g, ''); }
  setCarbs(text: string): void { this.carbs = text.replace(/[^0-9]/g, ''); }
  setFat(text: string): void { this.fat = text.replace(/[^0-9]/g, ''); }
  setLocation(text: string): void { this.location = text; }

  addIngredient(): void { this.ingredients = [...this.ingredients, '']; }
  removeIngredient(index: number): void {
    if (this.ingredients.length <= 1) return;
    this.ingredients = this.ingredients.filter((_, i) => i !== index);
  }
  setIngredient(index: number, value: string): void {
    const updated = [...this.ingredients];
    updated[index] = value;
    this.ingredients = updated;
  }

  addStep(): void { this.steps = [...this.steps, '']; }
  removeStep(index: number): void {
    if (this.steps.length <= 1) return;
    this.steps = this.steps.filter((_, i) => i !== index);
  }
  setStep(index: number, value: string): void {
    const updated = [...this.steps];
    updated[index] = value;
    this.steps = updated;
  }

  toggleTag(tag: string): void {
    if (this.tags.includes(tag)) {
      this.tags = this.tags.filter(t => t !== tag);
    } else if (this.tags.length < 5) {
      this.tags = [...this.tags, tag];
    }
  }

  get cleanIngredients(): string[] {
    return this.ingredients.filter(i => i.trim().length > 0);
  }

  get cleanSteps(): string[] {
    return this.steps.filter(s => s.trim().length > 0);
  }

  async saveEdit(): Promise<boolean> {
    if (!this.editPostId) return false;
    runInAction(() => { this.isUploading = true; this.error = null; });
    try {
      await this.postRepo.updatePost(this.editPostId, {
        caption: this.caption || undefined,
        title: this.title || undefined,
        cookTime: this.cookTime ? parseInt(this.cookTime) : undefined,
        prepTime: this.prepTime ? parseInt(this.prepTime) : undefined,
        servings: this.servings ? parseInt(this.servings) : undefined,
        difficulty: this.difficulty || undefined,
        calories: this.calories ? parseInt(this.calories) : undefined,
        protein: this.protein ? parseInt(this.protein) : undefined,
        carbs: this.carbs ? parseInt(this.carbs) : undefined,
        fat: this.fat ? parseInt(this.fat) : undefined,
        ingredients: this.cleanIngredients.length ? this.cleanIngredients : undefined,
        steps: this.cleanSteps.length ? this.cleanSteps : undefined,
        tags: this.tags.length ? this.tags : undefined,
        location: this.location || undefined,
      } as any);
      return true;
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to save changes'; });
      return false;
    } finally {
      runInAction(() => { this.isUploading = false; });
    }
  }

  async createPost(authorId: string): Promise<Post | null> {
    if (!this.title.trim()) {
      runInAction(() => { this.error = 'Recipe title is required' });
      return null;
    }
    if (this.tags.length === 0) {
      runInAction(() => { this.error = 'Please select at least one category tag' });
      return null;
    }
    if (this.cleanIngredients.length === 0) {
      runInAction(() => { this.error = 'Please add at least one ingredient' });
      return null;
    }
    if (this.cleanSteps.length === 0) {
      runInAction(() => { this.error = 'Please add at least one step' });
      return null;
    }

    runInAction(() => { this.isUploading = true; this.uploadProgress = 0; this.error = null; });
    try {
      const allMedia: MediaItem[] = [
        ...this.media.map((m, i) => ({ ...m, order: i })),
        ...(this.recipeVideo ? [{ ...this.recipeVideo, order: this.media.length }] : []),
      ];
      const post = await this.postRepo.createPost({
        authorId,
        caption: this.caption || undefined,
        title: this.title || undefined,
        cookTime: this.cookTime ? parseInt(this.cookTime) : undefined,
        prepTime: this.prepTime ? parseInt(this.prepTime) : undefined,
        servings: this.servings ? parseInt(this.servings) : undefined,
        difficulty: this.difficulty || undefined,
        calories: this.calories ? parseInt(this.calories) : undefined,
        protein: this.protein ? parseInt(this.protein) : undefined,
        carbs: this.carbs ? parseInt(this.carbs) : undefined,
        fat: this.fat ? parseInt(this.fat) : undefined,
        ingredients: this.cleanIngredients.length ? this.cleanIngredients : undefined,
        steps: this.cleanSteps.length ? this.cleanSteps : undefined,
        tags: this.tags.length ? this.tags : undefined,
        location: this.location || undefined,
        media: allMedia,
        uploadStatus: 'pending',
      } as any);

      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        runInAction(() => { this.uploadProgress = i; });
      }

      await this.postRepo.updatePost(post.id, { uploadStatus: 'uploaded' });
      runInAction(() => { this.isUploading = false; this.uploadProgress = 100; });
      this.reset();
      return post;
    } catch (e: any) {
      runInAction(() => { this.isUploading = false; this.error = e.message || 'Failed to create post'; });
      return null;
    }
  }

  reset(): void {
    this.media = [];
    this.recipeVideo = null;
    this.caption = '';
    this.title = '';
    this.cookTime = '';
    this.prepTime = '';
    this.servings = '';
    this.difficulty = '';
    this.calories = '';
    this.protein = '';
    this.carbs = '';
    this.fat = '';
    this.ingredients = [''];
    this.steps = [''];
    this.tags = [];
    this.location = '';
    this.editPostId = null;
    this.uploadProgress = 0;
    this.error = null;
  }
}
