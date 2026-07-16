import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { SupportedLanguage } from '../i18n/config';

/**
 * Hook for translating dynamic content with loading state
 */
export const useTranslatedContent = (
    originalText: string,
    sourceLang: SupportedLanguage = 'en'
) => {
    const { translateText, currentLanguage, autoTranslateEnabled } = useLanguage();
    const [translatedText, setTranslatedText] = useState(originalText);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        const translate = async () => {
            // Skip if auto-translate is disabled or same language
            if (!autoTranslateEnabled || currentLanguage === sourceLang) {
                setTranslatedText(originalText);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const result = await translateText(originalText, sourceLang);
                if (isMounted) {
                    setTranslatedText(result);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err as Error);
                    setTranslatedText(originalText); // Fallback to original
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        translate();

        return () => {
            isMounted = false;
        };
    }, [originalText, sourceLang, currentLanguage, autoTranslateEnabled, translateText]);

    return { translatedText, isLoading, error };
};

/**
 * Hook for translating multiple texts efficiently
 */
export const useTranslatedBatch = (
    originalTexts: string[],
    sourceLang: SupportedLanguage = 'en'
) => {
    const { translateBatch, currentLanguage, autoTranslateEnabled } = useLanguage();
    const [translations, setTranslations] = useState<Map<string, string>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        const translate = async () => {
            // Skip if auto-translate is disabled or same language
            if (!autoTranslateEnabled || currentLanguage === sourceLang) {
                setTranslations(new Map(originalTexts.map(text => [text, text])));
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const result = await translateBatch(originalTexts, sourceLang);
                if (isMounted) {
                    setTranslations(result);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err as Error);
                    setTranslations(new Map(originalTexts.map(text => [text, text])));
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        translate();

        return () => {
            isMounted = false;
        };
    }, [originalTexts.join('|'), sourceLang, currentLanguage, autoTranslateEnabled, translateBatch]);

    return { translations, isLoading, error };
};

/**
 * Hook for TTS with controls
 */
export const useTTS = () => {
    const { speak, stopSpeaking, isSpeaking, ttsEnabled, currentLanguage } = useLanguage();
    const [error, setError] = useState<Error | null>(null);

    const speakText = useCallback(
        async (text: string, language?: SupportedLanguage) => {
            if (!ttsEnabled) {
                console.warn('TTS is disabled');
                return;
            }

            setError(null);
            try {
                await speak(text, language);
            } catch (err) {
                setError(err as Error);
            }
        },
        [speak, ttsEnabled]
    );

    const stop = useCallback(() => {
        stopSpeaking();
        setError(null);
    }, [stopSpeaking]);

    return {
        speak: speakText,
        stop,
        isSpeaking,
        isEnabled: ttsEnabled,
        currentLanguage,
        error,
    };
};

/**
 * Hook for debounced translation (useful for search/input fields)
 */
export const useDebouncedTranslation = (
    text: string,
    delay: number = 500,
    sourceLang: SupportedLanguage = 'en'
) => {
    const { translateText, currentLanguage, autoTranslateEnabled } = useLanguage();
    const [translatedText, setTranslatedText] = useState(text);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(async () => {
            if (!autoTranslateEnabled || currentLanguage === sourceLang) {
                setTranslatedText(text);
                return;
            }

            setIsLoading(true);
            try {
                const result = await translateText(text, sourceLang);
                if (isMounted) {
                    setTranslatedText(result);
                }
            } catch (error) {
                console.error('Debounced translation failed:', error);
                if (isMounted) {
                    setTranslatedText(text);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }, delay);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [text, delay, sourceLang, currentLanguage, autoTranslateEnabled, translateText]);

    return { translatedText, isLoading };
};
