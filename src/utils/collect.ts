import type {
  CollectMeta,
  CollectModelProviderInput,
  CollectSearchResult,
} from '../types';

export function normalizeCollectSearchResult(
  data: Partial<CollectSearchResult> | null | undefined,
  fallback: { guns?: string[]; creatorIds?: string[]; requestId?: string; isPending?: boolean } = {}
): CollectSearchResult {
  return {
    creators: Array.isArray(data?.creators) ? data.creators : [],
    guns: Array.isArray(data?.guns) ? data.guns : (fallback.guns || []),
    creatorIds: Array.isArray(data?.creatorIds) ? data.creatorIds : (fallback.creatorIds || []),
    videos: Array.isArray(data?.videos) ? data.videos : [],
    logs: Array.isArray(data?.logs) ? data.logs : [],
    errors: Array.isArray(data?.errors) ? data.errors : [],
    requestId: typeof data?.requestId === 'string' ? data.requestId : (fallback.requestId || ''),
    isPending: typeof data?.isPending === 'boolean' ? data.isPending : Boolean(fallback.isPending),
  };
}

export function normalizeCollectMeta(data: Partial<CollectMeta> | null | undefined): CollectMeta {
  const providers = Array.isArray(data?.providers) ? data.providers.map((provider) => ({
    id: String(provider.id || ''),
    name: String(provider.name || ''),
    baseUrl: String(provider.baseUrl || ''),
    models: Array.isArray(provider.models) ? provider.models.map(String) : [],
    hasApiKey: Boolean(provider.hasApiKey),
  })) : [];

  const modelOptions = Array.isArray(data?.modelOptions) ? data.modelOptions.map((option) => ({
    value: String(option.value || ''),
    providerId: String(option.providerId || ''),
    providerName: String(option.providerName || ''),
    model: String(option.model || ''),
    label: String(option.label || ''),
  })) : [];

  return {
    creators: Array.isArray(data?.creators) ? data.creators : [],
    models: Array.isArray(data?.models) ? data.models.map(String) : [],
    defaultModel: String(data?.defaultModel || ''),
    defaultGuns: Array.isArray(data?.defaultGuns) ? data.defaultGuns.map(String) : [],
    providers,
    modelOptions,
    concurrency: {
      searchEnabled: Boolean(data?.concurrency?.searchEnabled),
      applyEnabled: Boolean(data?.concurrency?.applyEnabled),
    },
  };
}

export function normalizePresetGunsInput(value: string) {
  return [...new Set(value.split(/[，,\s]+/).map((item) => item.trim()).filter(Boolean))];
}

export function buildProviderFormFromMeta(meta: CollectMeta, providerId: string): CollectModelProviderInput {
  const provider = meta.providers.find((item) => item.id === providerId);
  const defaultModel = meta.defaultModel && meta.defaultModel.startsWith(`${providerId}::`) ? meta.defaultModel.split('::').slice(1).join('::') : '';
  return {
    id: provider?.id || '',
    name: provider?.name || '',
    baseUrl: provider?.baseUrl || '',
    apiKey: '',
    models: provider?.models || [],
    selectedModel: defaultModel || provider?.models[0] || '',
    hasSavedApiKey: Boolean(provider?.hasApiKey),
  };
}

export async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    console.warn('API returned invalid JSON:', text);
    return {};
  }
}
