import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import teTranslations from './locales/te.json';
import knTranslations from './locales/kn.json';
import taTranslations from './locales/ta.json';

// Supported languages configuration
export const SUPPORTED_LANGUAGES = {
    en: { name: 'English', nativeName: 'English', flag: '🇺🇸', locale: 'en-US' },
    hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', locale: 'hi-IN' },
    te: { name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', locale: 'te-IN' },
    kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', locale: 'kn-IN' },
    ta: { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', locale: 'ta-IN' },
    es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', locale: 'es-ES' },
    fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// i18next configuration
i18n
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n instance to react-i18next
    .init({
        resources: {
            en: { translation: enTranslations },
            hi: { translation: hiTranslations },
            te: { translation: teTranslations },
            kn: { translation: knTranslations },
            ta: { translation: taTranslations },
            es: { translation: esTranslations },
            fr: { translation: frTranslations },
        },
        fallbackLng: 'en', // Fallback language
        debug: false, // Set to true for debugging

        interpolation: {
            escapeValue: false, // React already escapes values
        },

        detection: {
            // Order of language detection
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },

        react: {
            useSuspense: false, // Disable suspense to avoid blocking render
        },
    });

export default i18n;
