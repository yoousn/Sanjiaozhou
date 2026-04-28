export type UiCardSize = 'compact' | 'default' | 'roomy';
export type UiButtonStyle = 'soft' | 'solid' | 'outline';
export type UiRadius = 'lg' | 'xl' | 'full';
export type UiSidebarWidth = 'compact' | 'default';

export type UiPreferences = {
  cardSize: UiCardSize;
  cardMinHeight: 300 | 330 | 360 | 400;
  variantsPerPage: 2 | 3 | 4;
  gridColumns: 3 | 4;
  gridGap: 12 | 16 | 20 | 24;
  sidebarWidth: UiSidebarWidth;
  controlRadius: UiRadius;
  buttonStyle: UiButtonStyle;
};

export type CollectModelProviderInput = {
  id?: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  selectedModel?: string;
};

export type CollectModelProvider = {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  hasApiKey: boolean;
};

export type CollectModelOption = {
  value: string;
  providerId: string;
  providerName: string;
  model: string;
  label: string;
};

export type CollectConcurrencySettings = {
  searchEnabled: boolean;
  applyEnabled: boolean;
};

export type GunVariant = {
  id: string;
  tier: string;
  price: string;
  buildType: string;
  code: string;
  date: string;
  author?: string;
  sourceUrl?: string;
  locked?: boolean;
};

export type GunGroup = {
  id: string;
  name: string;
  category: string;
  pinned?: boolean;
  variants: GunVariant[];
};

export type CollectCreator = {
  id: string;
  name: string;
};

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
  description: string;
  tags: string[];
  createdAt: string;
  uploader: string;
  reactions: CommunityReactions;
  reactionTotal: number;
  comments?: CommunityComment[];
};

export type CommunityActivity = {
  id: string;
  postId: string;
  uploader: string;
  action: string;
  time: string;
};
