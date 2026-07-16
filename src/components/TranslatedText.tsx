import React from 'react';
import { useTranslatedContent } from '../hooks/useTranslation';
import { SupportedLanguage } from '../i18n/config';
import './TranslatedText.css';

interface TranslatedTextProps {
    text: string;
    sourceLang?: SupportedLanguage;
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    showSkeleton?: boolean;
    skeletonWidth?: string;
    fallbackText?: string;
    onTranslationComplete?: (translatedText: string) => void;
    children?: never; // Prevent children to avoid confusion
}

/**
 * TranslatedText Component
 * Automatically translates dynamic content with loading states
 */
export const TranslatedText: React.FC<TranslatedTextProps> = ({
    text,
    sourceLang = 'en',
    as: Component = 'span',
    className = '',
    showSkeleton = true,
    skeletonWidth = '100%',
    fallbackText,
    onTranslationComplete,
}) => {
    const { translatedText, isLoading, error } = useTranslatedContent(text, sourceLang);

    // Notify parent when translation completes
    React.useEffect(() => {
        if (!isLoading && !error && translatedText !== text) {
            onTranslationComplete?.(translatedText);
        }
    }, [translatedText, isLoading, error, text, onTranslationComplete]);

    // Show skeleton loader during translation
    if (isLoading && showSkeleton) {
        return (
            <Component className={`translated-text translated-text--loading ${className}`}>
                <span
                    className="translated-text__skeleton"
                    style={{ width: skeletonWidth }}
                    aria-label="Loading translation"
                    role="status"
                >
                    <span className="sr-only">Loading translation...</span>
                </span>
            </Component>
        );
    }

    // Show fallback text on error
    if (error && fallbackText) {
        return (
            <Component className={`translated-text translated-text--error ${className}`}>
                {fallbackText}
            </Component>
        );
    }

    // Show translated or original text
    return (
        <Component className={`translated-text ${className}`}>
            {translatedText}
        </Component>
    );
};

interface TranslatedHTMLProps {
    html: string;
    sourceLang?: SupportedLanguage;
    className?: string;
    showSkeleton?: boolean;
    sanitize?: boolean;
}

/**
 * TranslatedHTML Component
 * Translates and renders HTML content safely
 */
export const TranslatedHTML: React.FC<TranslatedHTMLProps> = ({
    html,
    sourceLang = 'en',
    className = '',
    showSkeleton = true,
    sanitize = true,
}) => {
    const { translatedText, isLoading } = useTranslatedContent(html, sourceLang);

    // Basic HTML sanitization (remove script tags)
    const sanitizeHTML = (htmlString: string): string => {
        if (!sanitize) return htmlString;
        return htmlString.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    };

    if (isLoading && showSkeleton) {
        return (
            <div className={`translated-html translated-html--loading ${className}`}>
                <div className="translated-html__skeleton" role="status">
                    <span className="sr-only">Loading translation...</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`translated-html ${className}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(translatedText) }}
        />
    );
};

export default TranslatedText;
