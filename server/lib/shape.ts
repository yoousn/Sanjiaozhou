import type { GunVariant, GunGroup } from "../../shared/types.js";

export type { GunVariant, GunGroup };

export function ensureVariantShape(variant: Partial<GunVariant>): GunVariant {
  return {
    id: variant.id || `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tier: variant.tier === "未标注" ? "" : (variant.tier || ""),
    price: variant.price === "未标注" ? "" : (variant.price || ""),
    buildType: variant.buildType === "未标注" ? "" : (variant.buildType || ""),
    code: variant.code || "",
    date: variant.date || "",
    author: variant.author || "",
    sourceUrl: variant.sourceUrl || "",
    locked: Boolean(variant.locked),
  };
}

export function ensureGroupShape(group: Partial<GunGroup>): GunGroup {
  return {
    id: group.id || `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: group.name || "未知枪械",
    category: group.category || "other",
    variants: Array.isArray(group.variants) ? group.variants.map(ensureVariantShape) : [],
    pinned: Boolean(group.pinned),
  };
}

export function normalizeGunName(name: string) {
  return (name || "").trim().toLowerCase();
}

export function trimUniqueStrings(values: string[] | undefined, fallback: string[] = []) {
  const items = Array.isArray(values) ? values : fallback;
  return [...new Set(items.map((value) => String(value || "").trim()).filter(Boolean))];
}