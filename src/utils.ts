import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const inputClasses = "w-full bg-black/5 hover:bg-black/10 focus:bg-white focus:ring-2 focus:ring-zinc-900/20 rounded px-2 py-1 outline-none transition-all placeholder-zinc-400 text-zinc-900 font-semibold";

export function buildModelOptionValue(providerId: string, model: string) {
  return `${providerId}::${model}`;
}

export function parseModelOptionValue(value: string) {
  const [providerId = '', ...modelParts] = (value || '').split('::');
  return {
    providerId,
    model: modelParts.join('::'),
  };
}
