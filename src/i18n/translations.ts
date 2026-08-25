import { en } from './locales/en';
import { vi } from './locales/vi';

export const locales = ['vi', 'en'] as const;

export type Locale = typeof locales[number];

type TranslationParams = Record<string, string | number>;

const translations = {
  vi,
  en,
} as const;

export type TranslationKey = keyof typeof translations.vi;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;

export function translate(locale: Locale, key: TranslationKey, params: TranslationParams = {}): string {
  const template: string = translations[locale][key];

  return Object.entries(params).reduce(
    (message, [name, value]) => message.replace(`{${name}}`, String(value)),
    template,
  );
}
