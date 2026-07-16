import { SupportedLanguage } from '../i18n/config';

/**
 * Translation Cache Interface
 * Stores translations in memory and localStorage for persistence
 */
class TranslationCache {
    private memoryCache: Map<string, string> = new Map();
    private readonly STORAGE_KEY = 'translation_cache';
    private readonly MAX_CACHE_SIZE = 1000;
    private readonly CACHE_EXPIRY_DAYS = 7;

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Generate cache key from text and language pair
     */
    private getCacheKey(text: string, sourceLang: string, targetLang: string): string {
        return `${sourceLang}:${targetLang}:${text.substring(0, 100)}`;
    }

    /**
     * Get translation from cache
     */
    get(text: string, sourceLang: string, targetLang: string): string | null {
        const key = this.getCacheKey(text, sourceLang, targetLang);
        return this.memoryCache.get(key) || null;
    }

    /**
     * Store translation in cache
     */
    set(text: string, sourceLang: string, targetLang: string, translation: string): void {
        const key = this.getCacheKey(text, sourceLang, targetLang);

        // Implement LRU-like behavior: if cache is full, remove oldest entries
        if (this.memoryCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }

        this.memoryCache.set(key, translation);
        this.saveToStorage();
    }

    /**
     * Load cache from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                const expiryDate = new Date(data.timestamp);
                expiryDate.setDate(expiryDate.getDate() + this.CACHE_EXPIRY_DAYS);

                // Check if cache is expired
                if (new Date() < expiryDate) {
                    this.memoryCache = new Map(Object.entries(data.cache));
                } else {
                    localStorage.removeItem(this.STORAGE_KEY);
                }
            }
        } catch (error) {
            console.warn('Failed to load translation cache from storage:', error);
        }
    }

    /**
     * Save cache to localStorage (debounced)
     */
    private saveToStorage = this.debounce((): void => {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                cache: Object.fromEntries(this.memoryCache),
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save translation cache to storage:', error);
        }
    }, 2000);

    /**
     * Debounce helper
     */
    private debounce<T extends (...args: any[]) => void>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout | null = null;
        return (...args: Parameters<T>) => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.memoryCache.clear();
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

/**
 * Translation API Service
 * Uses LibreTranslate or fallback translation service
 */
class TranslationAPI {
    private readonly API_URL = 'https://libretranslate.com/translate';
    private readonly FALLBACK_API_URL = 'https://translate.googleapis.com/translate_a/single';
    private requestQueue: Array<() => Promise<void>> = [];
    private isProcessing = false;
    private readonly BATCH_DELAY = 300; // ms

    /**
     * Translate text using API with fallback
     */
    async translate(
        text: string,
        sourceLang: string,
        targetLang: string
    ): Promise<string> {
        try {
            // Try LibreTranslate first
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text',
                }),
            });

            if (!response.ok) {
                throw new Error('LibreTranslate API failed');
            }

            const data = await response.json();
            return data.translatedText || text;
        } catch (error) {
            console.warn('Primary translation API failed, using fallback:', error);
            return this.fallbackTranslate(text, sourceLang, targetLang);
        }
    }

    /**
     * Fallback translation using Google Translate (unofficial)
     */
    private async fallbackTranslate(
        text: string,
        sourceLang: string,
        targetLang: string
    ): Promise<string> {
        try {
            const url = `${this.FALLBACK_API_URL}?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Fallback translation failed');
            }

            const data = await response.json();
            return data[0]?.map((item: any) => item[0]).join('') || text;
        } catch (error) {
            console.error('All translation APIs failed:', error);
            return text; // Return original text if all fails
        }
    }

    /**
     * Batch multiple translation requests
     */
    async batchTranslate(
        texts: string[],
        sourceLang: string,
        targetLang: string
    ): Promise<Map<string, string>> {
        const results = new Map<string, string>();

        // Process in parallel with limit
        const CONCURRENT_LIMIT = 3;
        for (let i = 0; i < texts.length; i += CONCURRENT_LIMIT) {
            const batch = texts.slice(i, i + CONCURRENT_LIMIT);
            const promises = batch.map(text =>
                this.translate(text, sourceLang, targetLang)
                    .then(translation => results.set(text, translation))
            );
            await Promise.all(promises);
        }

        return results;
    }
}

/**
 * Main Translation Service
 * Combines caching and API calls with intelligent fallback
 */
export class TranslationService {
    private cache: TranslationCache;
    private api: TranslationAPI;
    private pendingRequests: Map<string, Promise<string>> = new Map();

    constructor() {
        this.cache = new TranslationCache();
        this.api = new TranslationAPI();
    }

    /**
     * Translate text with caching and deduplication
     */
    async translateText(
        text: string,
        targetLang: SupportedLanguage,
        sourceLang: SupportedLanguage = 'en'
    ): Promise<string> {
        // Return original if same language
        if (sourceLang === targetLang) {
            return text;
        }

        // Check cache first
        const cached = this.cache.get(text, sourceLang, targetLang);
        if (cached) {
            return cached;
        }

        // Check if request is already pending (deduplication)
        const requestKey = `${sourceLang}:${targetLang}:${text}`;
        if (this.pendingRequests.has(requestKey)) {
            return this.pendingRequests.get(requestKey)!;
        }

        // Create new translation request
        const translationPromise = this.api
            .translate(text, sourceLang, targetLang)
            .then(translation => {
                this.cache.set(text, sourceLang, targetLang, translation);
                this.pendingRequests.delete(requestKey);
                return translation;
            })
            .catch(error => {
                console.error('Translation failed:', error);
                this.pendingRequests.delete(requestKey);
                return text; // Fallback to original text
            });

        this.pendingRequests.set(requestKey, translationPromise);
        return translationPromise;
    }

    /**
     * Translate multiple texts efficiently
     */
    async translateBatch(
        texts: string[],
        targetLang: SupportedLanguage,
        sourceLang: SupportedLanguage = 'en'
    ): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        const textsToTranslate: string[] = [];

        // Check cache for each text
        for (const text of texts) {
            if (sourceLang === targetLang) {
                results.set(text, text);
                continue;
            }

            const cached = this.cache.get(text, sourceLang, targetLang);
            if (cached) {
                results.set(text, cached);
            } else {
                textsToTranslate.push(text);
            }
        }

        // Translate uncached texts
        if (textsToTranslate.length > 0) {
            const translations = await this.api.batchTranslate(
                textsToTranslate,
                sourceLang,
                targetLang
            );

            // Store in cache and results
            translations.forEach((translation, text) => {
                this.cache.set(text, sourceLang, targetLang, translation);
                results.set(text, translation);
            });
        }

        return results;
    }

    /**
     * Clear translation cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}

// Export singleton instance
export const translationService = new TranslationService();
