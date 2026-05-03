import type { GunGroup, GunVariant } from "../../shared/types.js";
import { ensureVariantShape, ensureGroupShape, normalizeGunName, trimUniqueStrings } from "./shape.js";
import { MAX_VARIANTS_PER_GUN } from "./collectSettings.js";

export function sortVariantsNewestFirst(variants: GunVariant[]) {
  return [...variants].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function uniqueTrimmed(values: string[] | undefined, fallback: string[]) {
  return trimUniqueStrings(values, fallback);
}

export function mergeGroupVariants(existing: GunVariant[], incoming: GunVariant[]) {
  const locked = sortVariantsNewestFirst(existing.filter((variant) => variant.locked));
  const lockedCodes = new Set(locked.map((variant) => variant.code));
  const merged: GunVariant[] = [...locked];
  const seenCodes = new Set(lockedCodes);

  for (const variant of sortVariantsNewestFirst(incoming.map(ensureVariantShape))) {
    if (!variant.code || seenCodes.has(variant.code)) continue;
    merged.push({ ...variant, locked: false });
    seenCodes.add(variant.code);
  }

  for (const variant of sortVariantsNewestFirst(existing.filter((item) => !item.locked))) {
    if (merged.length >= MAX_VARIANTS_PER_GUN) break;
    if (!variant.code || seenCodes.has(variant.code)) continue;
    merged.push(ensureVariantShape(variant));
    seenCodes.add(variant.code);
  }

  return merged.slice(0, MAX_VARIANTS_PER_GUN);
}

export function mergeCollectedGroups(currentData: GunGroup[], incomingGroups: GunGroup[]) {
  const nextData = [...currentData];

  for (const rawGroup of incomingGroups) {
    const group = ensureGroupShape(rawGroup);
    const existingGroup = nextData.find((item) => normalizeGunName(item.name) === normalizeGunName(group.name));

    if (existingGroup) {
      existingGroup.category = group.category || existingGroup.category;
      existingGroup.variants = mergeGroupVariants(existingGroup.variants, group.variants);
      continue;
    }

    nextData.unshift({
      ...group,
      variants: mergeGroupVariants([], group.variants),
    });
  }

  return nextData;
}
