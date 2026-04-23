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
