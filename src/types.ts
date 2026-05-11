export type UiCardSize = 'compact' | 'default' | 'roomy';
export type UiButtonStyle = 'soft' | 'solid' | 'outline';
export type UiRadius = 'lg' | 'xl' | 'full';
export type UiSidebarWidth = 'compact' | 'default';
export type UiDensityPreset = 'compact' | 'balanced' | 'comfortable';

export type UiPreferences = {
  useGlobalAppearance: boolean;
  cardSize: UiCardSize;
  densityPreset?: UiDensityPreset;
  cardMinHeight: number;
  variantsPerPage: number;
  gridColumns: number;
  gridGap: number;
  groupsPerPage: number;
  sidebarWidth: UiSidebarWidth;
  controlRadius: UiRadius;
  buttonStyle: UiButtonStyle;
  appTitle?: string;
  appSubtitle?: string;
  categoryWidgetIndex?: number;
  categoryWidgetSize?: 'compact' | 'full';
};

export type AppearanceConfig = {
  siteName: string;
  siteDescription: string;
  customHead: string;
  customBody: string;
  faviconUrl: string;
  customEnabled: boolean;
  backgroundUrl: string;
  backgroundFixed: boolean;
  blurStrength: number;
  opacity: number;
  radius: number;
  glow: number;
  gunTextColorLight: string;
  gunTextColorDark: string;
  gunCodeColorLight: string;
  gunCodeColorDark: string;
  gunSourceColorLight: string;
  gunSourceColorDark: string;
};

export type CollectModelProviderInput = {
  id?: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  selectedModel?: string;
  hasSavedApiKey?: boolean;
};

export type CollectModelProvider = {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  hasApiKey: boolean;
};

import type {
  GunVariant,
  GunGroup,
  CollectConcurrencySettings,
  CollectModelOption,
  CollectCreator,
} from '../shared/types';

export type { GunVariant, GunGroup, CollectConcurrencySettings, CollectModelOption, CollectCreator };

export type CollectVideoCandidate = {
  id: string;
  bvid: string;
  title: string;
  description?: string;
  author: string;
  uploadDate: string;
  url: string;
  matchedIn: Array<'title' | 'description'>;
};

export type CollectSearchLog = {
  timestamp: number;
  stage: string;
  creatorId?: string;
  creatorName?: string;
  videoId?: string;
  message: string;
};

export type CollectPreviewLog = {
  title?: string;
};

export type CollectPreview = {
  success?: boolean;
  model?: string;
  target_guns?: string[];
  creatorIds?: string[];
  videoIds?: string[];
  groups: GunGroup[];
  logs?: CollectPreviewLog[];
  errors?: string[];
};

export type ModelTestResult = {
  model: string;
  success: boolean;
  latencyMs: number;
  error?: string;
};

export type CollectMeta = {
  creators: CollectCreator[];
  models: string[];
  defaultModel: string;
  defaultGuns: string[];
  providers: CollectModelProvider[];
  modelOptions: CollectModelOption[];
  concurrency: CollectConcurrencySettings;
};

export type CollectSearchResult = {
  creators: CollectCreator[];
  guns: string[];
  creatorIds: string[];
  videos: CollectVideoCandidate[];
  logs?: CollectSearchLog[];
  errors?: string[];
  requestId?: string;
  isPending?: boolean;
};

export type CommunityReactions = {
  fire: number;
  money: number;
  skull: number;
};

export type CommunityComment = {
  id: string;
  postId: string;
  content: string;
  author: string;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  description: string;
  tags: string[];
  createdAt: string;
  uploader: string;
  reactions: CommunityReactions;
  reactionTotal: number;
  comments?: CommunityComment[];
  reactedUsers?: {
    fire: string[];
    money: string[];
    skull: string[];
  };
};

export type CommunityActivity = {
  id: string;
  postId: string;
  uploader: string;
  action: string;
  time: string;
};

export type AuthUser = {
  id: string;
  username: string;
};

