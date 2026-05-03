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

export type CollectConcurrencySettings = {
  searchEnabled: boolean;
  applyEnabled: boolean;
};

export type CollectModelOption = {
  value: string;
  providerId: string;
  providerName: string;
  model: string;
  label: string;
};

export type CollectCreator = {
  id: string;
  name: string;
};
