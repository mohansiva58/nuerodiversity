import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../i18n/config';
import { translationService } from '../services/translationService';
import { ttsService } from '../services/ttsService';

/**
 * Language Context State Interface
 */
interface LanguageContextState {
    currentLanguage: SupportedLanguage;
    isTranslating: boolean;
    autoTranslateEnabled: boolean;
    ttsEnabled: boolean;
    changeLanguage: (language: SupportedLanguage) => Promise<void>;
    translateText: (text: string, sourceLang?: SupportedLanguage) => Promise<string>;
    translateBatch: (texts: string[], sourceLang?: SupportedLanguage) => Promise<Map<string, string>>;
    toggleAutoTranslate: () => void;
    toggleTTS: () => void;
    speak: (text: string, language?: SupportedLanguage) => Promise<void>;
    stopSpeaking: () => void;
    isSpeaking: boolean;
    clearTranslationCache: () => void;
}

/**
 * Language Context
 */
const LanguageContext = createContext<LanguageContextState | undefined>(undefined);

/**
 * Language Provider Props
 */
interface LanguageProviderProps {
    children: ReactNode;
    defaultLanguage?: SupportedLanguage;
}

/**
 * Language Provider Component
 * Manages global language state, translation, and TTS
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({
    children,
    defaultLanguage = 'en',
}) => {
    const { i18n } = useTranslation();
    const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
        (localStorage.getItem('preferredLanguage') as SupportedLanguage) || defaultLanguage
    );
    const [isTranslating, setIsTranslating] = useState(false);
    const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(
        localStorage.getItem('autoTranslateEnabled') === 'true'
    );
    const [ttsEnabled, setTTSEnabled] = useState(
        localStorage.getItem('ttsEnabled') === 'true'
    );
    const [isSpeaking, setIsSpeaking] = useState(false);

    /**
     * Initialize language on mount
     */
    useEffect(() => {
        i18n.changeLanguage(currentLanguage);
    }, []);

    /**
     * Change current language
     */
    const changeLanguage = useCallback(async (language: SupportedLanguage) => {
        try {
            setIsTranslating(true);

            // Change i18next language (for static content)
            await i18n.changeLanguage(language);

            // Update state and localStorage
            setCurrentLanguage(language);
            localStorage.setItem('preferredLanguage', language);

            // Announce language change for screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('role', 'status');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = `Language changed to ${SUPPORTED_LANGUAGES[language].name}`;
            document.body.appendChild(announcement);
            setTimeout(() => document.body.removeChild(announcement), 1000);

        } catch (error) {
            console.error('Failed to change language:', error);
            throw error;
        } finally {
            setIsTranslating(false);
        }
    }, [i18n]);

    /**
     * Translate single text
     */
    const translateText = useCallback(
        async (text: string, sourceLang: SupportedLanguage = 'en'): Promise<string> => {
            if (!autoTranslateEnabled || currentLanguage === sourceLang) {
                return text;
            }

            try {
                setIsTranslating(true);
                const translated = await translationService.translateText(
                    text,
                    currentLanguage,
                    sourceLang
                );
                return translated;
            } catch (error) {
                console.error('Translation failed:', error);
                return text; // Return original text on failure
            } finally {
                setIsTranslating(false);
            }
        },
        [currentLanguage, autoTranslateEnabled]
    );

    /**
     * Translate multiple texts efficiently
     */
    const translateBatch = useCallback(
        async (
            texts: string[],
            sourceLang: SupportedLanguage = 'en'
        ): Promise<Map<string, string>> => {
            if (!autoTranslateEnabled || currentLanguage === sourceLang) {
                return new Map(texts.map(text => [text, text]));
            }

            try {
                setIsTranslating(true);
                const translations = await translationService.translateBatch(
                    texts,
                    currentLanguage,
                    sourceLang
                );
                return translations;
            } catch (error) {
                console.error('Batch translation failed:', error);
                return new Map(texts.map(text => [text, text]));
            } finally {
                setIsTranslating(false);
            }
        },
        [currentLanguage, autoTranslateEnabled]
    );

    /**
     * Toggle auto-translate feature
     */
    const toggleAutoTranslate = useCallback(() => {
        const newValue = !autoTranslateEnabled;
        setAutoTranslateEnabled(newValue);
        localStorage.setItem('autoTranslateEnabled', String(newValue));
    }, [autoTranslateEnabled]);

    /**
     * Toggle TTS feature
     */
    const toggleTTS = useCallback(() => {
        const newValue = !ttsEnabled;
        setTTSEnabled(newValue);
        localStorage.setItem('ttsEnabled', String(newValue));

        // Stop speaking if disabling TTS
        if (!newValue) {
            ttsService.stop();
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setIsSpeaking(false);
        }
    }, [ttsEnabled, isSpeaking]);

    /**
     * Speak text using TTS
     */
    const speak = useCallback(
        async (text: string, language?: SupportedLanguage): Promise<void> => {
            if (!ttsEnabled) {
                console.warn('TTS is disabled');
                return;
            }

            const speakLanguage = language || currentLanguage;

            try {
                await ttsService.speak(text, speakLanguage, {
                    onStart: () => setIsSpeaking(true),
                    onEnd: () => setIsSpeaking(false),
                    onError: (error) => {
                        console.error('TTS error:', error);
                        setIsSpeaking(false);
                    },
                });
            } catch (error) {
                console.error('Failed to speak:', error);
                setIsSpeaking(false);
            }
        },
        [ttsEnabled, currentLanguage]
    );

    /**
     * Stop current speech
     */
    const stopSpeaking = useCallback(() => {
        ttsService.stop();
        setIsSpeaking(false);
    }, []);

    /**
     * Clear translation cache
     */
    const clearTranslationCache = useCallback(() => {
        translationService.clearCache();
    }, []);

    /**
     * Context value
     */
    const value: LanguageContextState = {
        currentLanguage,
        isTranslating,
        autoTranslateEnabled,
        ttsEnabled,
        changeLanguage,
        translateText,
        translateBatch,
        toggleAutoTranslate,
        toggleTTS,
        speak,
        stopSpeaking,
        isSpeaking,
        clearTranslationCache,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

/**
 * Hook to use Language Context
 */
export const useLanguage = (): LanguageContextState => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

/**
 * Hook for static translations (i18next)
 */
export { useTranslation };
