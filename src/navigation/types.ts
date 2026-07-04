export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
};

export type MainDrawerParamList = {
  HomeTabs: undefined;
  Settings: undefined;
  SavedPosts: undefined;
  Help: undefined;
};

export type HomeTabParamList = {
  Home: undefined;
  Explore: undefined;
  Add: undefined;
  Messages: undefined;
  Profile: { userId?: string };
};

export type HomeStackParamList = {
  Feed: undefined;
  PostDetails: { postId: string };
  Comments: { postId: string };
  UserProfile: { userId: string };
};

export type ExploreStackParamList = {
  ExploreMain: undefined;
  Search: undefined;
  SearchResults: { query: string };
  Category: { category: string };
};

export type AddStackParamList = {
  CreatePost: undefined;
  CreateStory: undefined;
  EditPost: { postId: string };
};

export type MessagesStackParamList = {
  ConversationsList: undefined;
  Chat: { conversationId: string; userId?: string };
};

export type ProfileStackParamList = {
  ProfileMain: { userId?: string };
  EditProfile: undefined;
  Analytics: undefined;
  Followers: { userId: string };
  Following: { userId: string };
  StoryHighlights: { userId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};
