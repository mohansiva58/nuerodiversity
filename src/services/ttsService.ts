import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../i18n/config';

/**
 * Phonetic Correction Dictionary
 * Maps special words to their phonetic pronunciations for better TTS
 */
const PHONETIC_CORRECTIONS: Record<SupportedLanguage, Record<string, string>> = {
    en: {
        'ADHD': 'A D H D',
        'API': 'A P I',
        'UI': 'U I',
        'FAQ': 'F A Q',
        'CEO': 'C E O',
        'AI': 'A I',
        'ML': 'M L',
        'TTS': 'T T S',
    },
    hi: {
        'ADHD': 'ए डी एच डी',
        'API': 'ए पी आई',
        'UI': 'यू आई',
        'FAQ': 'एफ ए क्यू',
        'CEO': 'सी ई ओ',
        'AI': 'ए आई',
        'ML': 'एम एल',
        'TTS': 'टी टी एस',
    },
    te: {
        'ADHD': 'ఎ డి హెచ్ డి',
        'API': 'ఎ పి ఐ',
        'UI': 'యు ఐ',
        'FAQ': 'ఎఫ్ ఎ క్యూ',
        'CEO': 'సి ఇ ఓ',
        'AI': 'ఎ ఐ',
        'ML': 'ఎమ్ ఎల్',
        'TTS': 'టి టి ఎస్',
    },
    es: {
        'ADHD': 'A D H D',
        'API': 'A P I',
        'UI': 'U I',
        'FAQ': 'F A Q',
        'CEO': 'C E O',
        'AI': 'A I',
        'ML': 'M L',
        'TTS': 'T T S',
    },
    fr: {
        'ADHD': 'A D H D',
        'API': 'A P I',
        'UI': 'U I',
        'FAQ': 'F A Q',
        'CEO': 'C E O',
        'AI': 'A I',
        'ML': 'M L',
        'TTS': 'T T S',
    },
};

/**
 * Voice Configuration for each locale
 */
interface VoiceConfig {
    lang: string;
    preferredVoices: string[]; // Ordered by preference
    rate: number;
    pitch: number;
    volume: number;
}

const VOICE_CONFIGS: Record<SupportedLanguage, VoiceConfig> = {
    en: {
        lang: 'en-US',
        preferredVoices: [
            'Google US English',
            'Microsoft Zira',
            'Samantha',
            'Alex',
            'Karen',
        ],
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
    },
    hi: {
        lang: 'hi-IN',
        preferredVoices: [
            'Google हिन्दी',
            'Microsoft Hemant',
            'Lekha',
            'Google Hindi',
        ],
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
    },
    te: {
        lang: 'te-IN',
        preferredVoices: [
            'Google తెలుగు',
            'Microsoft Heera',
            'Google Telugu',
        ],
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
    },
    es: {
        lang: 'es-ES',
        preferredVoices: [
            'Google español',
            'Microsoft Helena',
            'Monica',
            'Paulina',
            'Google Spanish',
        ],
        rate: 0.95,
        pitch: 1.0,
        volume: 1.0,
    },
    fr: {
        lang: 'fr-FR',
        preferredVoices: [
            'Google français',
            'Microsoft Hortense',
            'Amelie',
            'Thomas',
            'Google French',
        ],
        rate: 0.95,
        pitch: 1.0,
        volume: 1.0,
    },
};

/**
 * Text-to-Speech Service
 * Provides locale-locked TTS with pronunciation corrections
 */
export class TTSService {
    private synthesis: SpeechSynthesis;
    private voices: SpeechSynthesisVoice[] = [];
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private isInitialized = false;

    constructor() {
        this.synthesis = window.speechSynthesis;
        this.initializeVoices();
    }

    /**
     * Initialize and load available voices
     */
    private initializeVoices(): void {
        const loadVoices = () => {
            this.voices = this.synthesis.getVoices();
            this.isInitialized = true;
        };

        // Load voices immediately if available
        loadVoices();

        // Some browsers load voices asynchronously
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = loadVoices;
        }
    }

    /**
     * Wait for voices to be loaded
     */
    private async waitForVoices(): Promise<void> {
        if (this.isInitialized && this.voices.length > 0) {
            return;
        }

        return new Promise((resolve) => {
            const checkVoices = () => {
                this.voices = this.synthesis.getVoices();
                if (this.voices.length > 0) {
                    this.isInitialized = true;
                    resolve();
                } else {
                    setTimeout(checkVoices, 100);
                }
            };
            checkVoices();
        });
    }

    /**
     * Get the best available voice for a language
     */
    private getBestVoice(language: SupportedLanguage): SpeechSynthesisVoice | null {
        const config = VOICE_CONFIGS[language];

        // Try to find preferred voices in order
        for (const preferredVoice of config.preferredVoices) {
            const voice = this.voices.find(v =>
                v.name.includes(preferredVoice) || v.lang === config.lang
            );
            if (voice) return voice;
        }

        // Fallback to any voice matching the language code
        const fallbackVoice = this.voices.find(v =>
            v.lang.startsWith(language) || v.lang === config.lang
        );

        if (fallbackVoice) return fallbackVoice;

        // Last resort: return first available voice
        console.warn(`No voice found for ${language}, using default`);
        return this.voices[0] || null;
    }

    /**
     * Apply phonetic corrections to text
     */
    private applyPhoneticCorrections(text: string, language: SupportedLanguage): string {
        const corrections = PHONETIC_CORRECTIONS[language];
        let correctedText = text;

        Object.entries(corrections).forEach(([word, pronunciation]) => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            correctedText = correctedText.replace(regex, pronunciation);
        });

        return correctedText;
    }

    /**
     * Speak text in specified language
     */
    async speak(
        text: string,
        language: SupportedLanguage,
        options?: {
            rate?: number;
            pitch?: number;
            volume?: number;
            onStart?: () => void;
            onEnd?: () => void;
            onError?: (error: Error) => void;
        }
    ): Promise<void> {
        // Stop any ongoing speech
        this.stop();

        // Wait for voices to load
        await this.waitForVoices();

        // Get voice configuration
        const config = VOICE_CONFIGS[language];
        const voice = this.getBestVoice(language);

        if (!voice) {
            const error = new Error(`No voice available for language: ${language}`);
            options?.onError?.(error);
            throw error;
        }

        // Apply phonetic corrections
        const correctedText = this.applyPhoneticCorrections(text, language);

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(correctedText);
        utterance.voice = voice;
        utterance.lang = config.lang;
        utterance.rate = options?.rate ?? config.rate;
        utterance.pitch = options?.pitch ?? config.pitch;
        utterance.volume = options?.volume ?? config.volume;

        // Set up event handlers
        utterance.onstart = () => {
            options?.onStart?.();
        };

        utterance.onend = () => {
            this.currentUtterance = null;
            options?.onEnd?.();
        };

        utterance.onerror = (event) => {
            this.currentUtterance = null;
            const error = new Error(`Speech synthesis error: ${event.error}`);
            options?.onError?.(error);
        };

        // Store current utterance and speak
        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
    }

    /**
     * Pause current speech
     */
    pause(): void {
        if (this.synthesis.speaking && !this.synthesis.paused) {
            this.synthesis.pause();
        }
    }

    /**
     * Resume paused speech
     */
    resume(): void {
        if (this.synthesis.paused) {
            this.synthesis.resume();
        }
    }

    /**
     * Stop current speech
     */
    stop(): void {
        this.synthesis.cancel();
        this.currentUtterance = null;
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this.synthesis.speaking;
    }

    /**
     * Check if speech is paused
     */
    isPaused(): boolean {
        return this.synthesis.paused;
    }

    /**
     * Get available voices for a language
     */
    getAvailableVoices(language?: SupportedLanguage): SpeechSynthesisVoice[] {
        if (!language) {
            return this.voices;
        }

        const config = VOICE_CONFIGS[language];
        return this.voices.filter(v =>
            v.lang === config.lang || v.lang.startsWith(language)
        );
    }

    /**
     * Add custom phonetic correction
     */
    addPhoneticCorrection(
        language: SupportedLanguage,
        word: string,
        pronunciation: string
    ): void {
        if (!PHONETIC_CORRECTIONS[language]) {
            PHONETIC_CORRECTIONS[language] = {};
        }
        PHONETIC_CORRECTIONS[language][word] = pronunciation;
    }

    /**
     * Check if TTS is supported
     */
    static isSupported(): boolean {
        return 'speechSynthesis' in window;
    }
}

// Export singleton instance
export const ttsService = new TTSService();
