/**
 * i18n Configuration
 * 
 * Uses local JSON translation files for best performance and reliability.
 * Supports 10 languages with auto-detection.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import local translation files
import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';

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
            zh: { translation: zh },
            ja: { translation: ja },
            ko: { translation: ko },
            es: { translation: es },
            fr: { translation: fr },
            de: { translation: de },
            pt: { translation: pt },
            ru: { translation: ru },
            ar: { translation: ar },
        },
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',

        interpolation: {
            escapeValue: false, // React already escapes values
        },

        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'aiModelDBPro_language',
            caches: ['localStorage'],
        }
    });

// Placeholder for compatibility with previous dynamic implementation
// This allows us to keep the interface consistent even if we switch back to static files
export async function translateToLanguage(targetLang: LanguageCode): Promise<void> {
    await i18n.changeLanguage(targetLang);
}

export function clearTranslationCache() {
    // No-op for static files, but kept for compatibility
    console.log('[i18n] Cache clear requested (using static files)');
}

export default i18n;
