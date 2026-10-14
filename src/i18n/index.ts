/**
 * i18n Configuration
 * 
 * Uses local JSON translation files for best performance and reliability.
 * Supports 10 languages with auto-detection.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English ships in the main bundle; every other language is loaded on demand
// so the ~400 KB of locale JSON is not parsed before first paint.
import en from './locales/en.json';

// Available languages
export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// Initialize i18n
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
        },
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',

        interpolation: {
            escapeValue: false, // React already escapes values
        },

        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'aiModelDB_language',
            caches: ['localStorage'],
        }
    });

type LoadableLanguage = Exclude<LanguageCode, 'en'>;

const LANGUAGE_LOADERS: Record<LoadableLanguage, () => Promise<{ default: Record<string, unknown> }>> = {
    zh: () => import('./locales/zh.json'),
    ja: () => import('./locales/ja.json'),
    ko: () => import('./locales/ko.json'),
    es: () => import('./locales/es.json'),
    fr: () => import('./locales/fr.json'),
    de: () => import('./locales/de.json'),
    pt: () => import('./locales/pt.json'),
    ru: () => import('./locales/ru.json'),
    ar: () => import('./locales/ar.json'),
};

async function ensureLanguageLoaded(code: string): Promise<void> {
    const base = code.split('-')[0] as LanguageCode;
    if (base === 'en' || !(base in LANGUAGE_LOADERS) || i18n.hasResourceBundle(base, 'translation')) return;
    const bundle = await LANGUAGE_LOADERS[base as LoadableLanguage]();
    i18n.addResourceBundle(base, 'translation', bundle.default, true, true);
}

export async function translateToLanguage(targetLang: LanguageCode): Promise<void> {
    await ensureLanguageLoaded(targetLang);
    await i18n.changeLanguage(targetLang);
}

// The detector may pick a non-English language at startup; load it, then re-resolve.
ensureLanguageLoaded(i18n.language || 'en')
    .then(() => i18n.changeLanguage(i18n.language))
    .catch((error) => console.error('[i18n] Failed to load detected language:', error));

export function clearTranslationCache() {
    // No-op: translations are static JSON files, kept for API compatibility
}

export default i18n;
