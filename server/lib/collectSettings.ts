import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { writeJsonAtomic } from "./atomicJson.js";
import { trimUniqueStrings } from "./shape.js";
import type {
  CollectConcurrencySettings,
  CollectModelOption,
  CollectCreator,
} from "../../shared/types.js";
import { buildModelOptionValue, parseModelOptionValue } from "../../shared/modelOption.js";

export { buildModelOptionValue, parseModelOptionValue };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type BackendCollectModelProvider = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  hasApiKey?: boolean;
};

export const COLLECT_SETTINGS_FILE = path.join(__dirname, "..", "..", "scripts", "collect_settings.json");
export const COLLECT_SCRIPT = path.join(__dirname, "..", "..", "scripts", "collect_bilibili_test.py");
export const MAX_VARIANTS_PER_GUN = 5;
export const DEFAULT_PRESET_GUNS = ["M4A1", "AKM", "SCAR-L", "AUG", "MP7", "AWM", "M14"];
export const DEFAULT_PROVIDER_ID = "builtin-default";
export const BUILTIN_PROVIDER: BackendCollectModelProvider = {
  id: DEFAULT_PROVIDER_ID,
  name: "yousn.me 接口",
  baseUrl: process.env.DEFAULT_PROVIDER_BASE_URL || "https://api.yousn.me/v1",
  apiKey: process.env.DEFAULT_PROVIDER_API_KEY || "",
  models: ["glm-5", "openai/gpt-oss-20b", "openai/gpt-oss-120b", "stepfun-ai/step-3.5-flash"],
  hasApiKey: Boolean(process.env.DEFAULT_PROVIDER_API_KEY),
};
export const DEFAULT_MODEL_VALUE = `${DEFAULT_PROVIDER_ID}::openai/gpt-oss-120b`;
export const CREATOR_OPTIONS: CollectCreator[] = [
  { id: "52717408", name: "Always聪聪" },
  { id: "5995562", name: "初水改枪" },
  { id: "2025603", name: "C8_saber" },
];

export type AutoCollectSettings = {
  enabled: boolean;
  model: string;
  backupModel: string;
  creatorIds: string[];
  intervalHours: number;
};

export type CollectSettings = {
  presetGuns: string[];
  providers: BackendCollectModelProvider[];
  defaultModel: string;
  concurrency: CollectConcurrencySettings;
  autoCollect: AutoCollectSettings;
};

export type CollectModelProviderMeta = {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  hasApiKey: boolean;
};

export function sanitizeProvider(provider: Partial<BackendCollectModelProvider>, fallbackId?: string): BackendCollectModelProvider {
  const id = String(provider.id || fallbackId || `provider_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).trim();
  return {
    id,
    name: String(provider.name || "未命名模型源").trim() || "未命名模型源",
    baseUrl: String(provider.baseUrl || "").trim().replace(/\/+$/, ""),
    apiKey: String(provider.apiKey || "").trim(),
    models: trimUniqueStrings(provider.models, []),
    hasApiKey: Boolean(provider.apiKey || String(provider.apiKey || "").trim().length > 0)
  };
}

export function getDefaultCollectSettings(): CollectSettings {
  return {
    presetGuns: [...DEFAULT_PRESET_GUNS],
    providers: [
      sanitizeProvider(BUILTIN_PROVIDER, DEFAULT_PROVIDER_ID),
    ],
    defaultModel: DEFAULT_MODEL_VALUE,
    concurrency: {
      searchEnabled: false,
      applyEnabled: false,
    },
    autoCollect: {
      enabled: false,
      model: DEFAULT_MODEL_VALUE,
      backupModel: "",
      creatorIds: [],
      intervalHours: 1,
    }
  };
}

export function readCollectSettings(): CollectSettings {
  const defaults = getDefaultCollectSettings();
  if (!fs.existsSync(COLLECT_SETTINGS_FILE)) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(COLLECT_SETTINGS_FILE, "utf-8") || "{}");
    const savedProviders = Array.isArray(parsed?.providers) ? parsed.providers.map((provider: Partial<BackendCollectModelProvider>) => sanitizeProvider(provider)) : [];
    const legacyHasCustomProviders = savedProviders.some((provider) => provider.id !== DEFAULT_PROVIDER_ID && provider.id !== "yousn-provider");
    const providers = savedProviders.length > 0
      ? savedProviders.filter((provider) => legacyHasCustomProviders || (provider.id !== DEFAULT_PROVIDER_ID && provider.id !== "yousn-provider"))
      : [...defaults.providers];
    const modelOptions = providers.flatMap((provider) => provider.models.map((model) => buildModelOptionValue(provider.id, model)));
    const fallbackModel = modelOptions[0] || DEFAULT_MODEL_VALUE;
    const defaultModel = modelOptions.includes(String(parsed?.defaultModel || "")) ? String(parsed.defaultModel) : fallbackModel;

    return {
      presetGuns: trimUniqueStrings(parsed?.presetGuns, DEFAULT_PRESET_GUNS),
      providers,
      defaultModel,
      concurrency: {
        searchEnabled: Boolean(parsed?.concurrency?.searchEnabled),
        applyEnabled: Boolean(parsed?.concurrency?.applyEnabled),
      },
      autoCollect: {
        enabled: Boolean(parsed?.autoCollect?.enabled),
        model: modelOptions.includes(String(parsed?.autoCollect?.model || "")) ? String(parsed.autoCollect.model) : defaultModel,
        backupModel: modelOptions.includes(String(parsed?.autoCollect?.backupModel || "")) ? String(parsed.autoCollect.backupModel) : "",
        creatorIds: Array.isArray(parsed?.autoCollect?.creatorIds) ? parsed.autoCollect.creatorIds : [],
        intervalHours: Number(parsed?.autoCollect?.intervalHours) || 1,
      }
    };
  } catch {
    return defaults;
  }
}

export function writeCollectSettings(settings: CollectSettings) {
  const providers = settings.providers
    .map((provider) => sanitizeProvider(provider))
    .filter((provider, index, array) => provider.baseUrl && provider.models.length > 0 && array.findIndex((item) => item.id === provider.id) === index);

  const modelOptions = providers.flatMap((provider) => provider.models.map((model) => buildModelOptionValue(provider.id, model)));
  const defaultModel = modelOptions.includes(settings.defaultModel) ? settings.defaultModel : (modelOptions[0] || "");
  const autoCollectModel = modelOptions.includes(String(settings.autoCollect?.model || "")) ? String(settings.autoCollect.model) : defaultModel;
  const autoCollectBackupModel = modelOptions.includes(String(settings.autoCollect?.backupModel || "")) ? String(settings.autoCollect.backupModel) : "";

  const nextSettings: CollectSettings = {
    presetGuns: trimUniqueStrings(settings.presetGuns, DEFAULT_PRESET_GUNS),
    providers,
    defaultModel,
    concurrency: {
      searchEnabled: Boolean(settings.concurrency.searchEnabled),
      applyEnabled: Boolean(settings.concurrency.applyEnabled),
    },
    autoCollect: {
      enabled: Boolean(settings.autoCollect?.enabled),
      model: autoCollectModel,
      backupModel: autoCollectBackupModel,
      creatorIds: Array.isArray(settings.autoCollect?.creatorIds) ? settings.autoCollect.creatorIds : [],
      intervalHours: Number(settings.autoCollect?.intervalHours) || 1,
    }
  };

  writeJsonAtomic(COLLECT_SETTINGS_FILE, nextSettings);
}

export function buildProviderMeta(provider: BackendCollectModelProvider): CollectModelProviderMeta {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    models: provider.models,
    hasApiKey: Boolean(provider.apiKey),
  };
}

export function buildCollectMeta(settings: CollectSettings) {
  const modelOptions: CollectModelOption[] = settings.providers.flatMap((provider) =>
    provider.models.map((model) => ({
      value: buildModelOptionValue(provider.id, model),
      providerId: provider.id,
      providerName: provider.name,
      model,
      label: `${provider.name} / ${model}`,
    }))
  );

  const defaultModel = modelOptions.some((option) => option.value === settings.defaultModel)
    ? settings.defaultModel
    : (modelOptions[0]?.value || "");

  return {
    creators: CREATOR_OPTIONS,
    models: modelOptions.map((option) => option.value),
    defaultModel,
    defaultGuns: settings.presetGuns,
    providers: settings.providers.map(buildProviderMeta),
    modelOptions,
    concurrency: settings.concurrency,
  };
}

export function getProviderAndModel(settings: CollectSettings, value?: string) {
  const parsed = parseModelOptionValue(value || settings.defaultModel);
  const provider = settings.providers.find((item) => item.id === parsed.providerId) || settings.providers[0];
  const model = provider?.models.includes(parsed.model) ? parsed.model : (provider?.models[0] || "");
  return { provider, model };
}
